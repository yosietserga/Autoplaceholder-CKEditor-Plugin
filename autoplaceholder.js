'use strict';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { toWidget, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import Command from '@ckeditor/ckeditor5-core/src/command';
import DowncastWriter from '@ckeditor/ckeditor5-engine/src/view/downcastwriter';

import Collection from '@ckeditor/ckeditor5-utils/src/collection';
import Model from '@ckeditor/ckeditor5-ui/src/model';

import { addListToDropdown, createDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon';
import clickOutsideHandler from '@ckeditor/ckeditor5-ui/src/bindings/clickoutsidehandler';
import ClickObserver from '@ckeditor/ckeditor5-engine/src/view/observer/clickobserver';
import MouseObserver from '@ckeditor/ckeditor5-engine/src/view/observer/mouseobserver';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import AutoPlaceholderFormView from './ui/autoplaceholderformview';

import bracketsIcon from './icons/brackets.svg';

const VISUAL_SELECTION_MARKER_NAME = 'autoplaceholder-ui';
const log = console.log;
const register = {};
register['clicked'] = false;

class AutoPlaceholderCommand extends Command {
    execute( { defaultValue, placeholder, id } ) {
        const editor = this.editor;
        const model = editor.model;
        const selection = editor.model.document.selection;
        let attributes = {
            ...Object.fromEntries( selection.getAttributes() ),
            name:defaultValue, 
            defaultValue
        };

        if (typeof placeholder != 'undefined') attributes['placeholder'] = placeholder;
        if (typeof id != 'undefined') attributes['id'] = id;
        if (typeof id != 'undefined') attributes['customId'] = id;
        if (typeof register['elements'] == 'undefined') register['elements'] = [];

        this.value = attributes.defaultValue;

        editor.model.change( writer => {
            if (!!register['viewElement']) {
                register['elements'].map( (item, k) => {
                    if (!!item && register['viewElement'] && item.getAttribute('id') == register['viewElement'].getAttribute('id')) {
                        writer.setSelection( item, 'on' );
                        const autoplaceholder = writer.createElement( 'autoplaceholder', attributes );
                        editor.model.insertContent( autoplaceholder );
                        writer.setSelection( autoplaceholder, 'on' );
                        writer.setAttribute('id', register['viewElement'].getAttribute('id'), autoplaceholder );
                        writer.setAttribute('customId', register['viewElement'].getAttribute('customId'), autoplaceholder );
                        register['elements'][k] = autoplaceholder;
                        register['viewElement'] = null;
                    }
                });
            } else {
                const autoplaceholder = writer.createElement( 'autoplaceholder', attributes );
                editor.model.insertContent( autoplaceholder );
                pushElement( autoplaceholder );
                writer.setSelection( autoplaceholder, 'on' );
            }
        });
    }

    refresh() {
        const model = this.editor.model;
        const selection = model.document.selection;
        const isAllowed = model.schema.checkChild( selection.focus.parent, 'autoplaceholder' );

        this.isEnabled = isAllowed;
    }
}

class AutoPlaceholderUI extends Plugin {/**
     * @inheritDoc
     */
    static get requires() {
        return [ ContextualBalloon ];
    }

    init() {
        const editor = this.editor;
        const t = editor.t;
        const autoplaceholderNames = editor.config.get( 'autoplaceholder.tokenList' );
        const label = typeof editor.config.get( 'autoplaceholder.label' ) != 'undefined' && editor.config.get( 'autoplaceholder.label' ).length > 0 ? editor.config.get( 'autoplaceholder.label' ) : t( 'AutoPlaceholder' );

        this.textos = typeof editor.config.get( 'autoplaceholder.textos' ) != 'undefined' ? editor.config.get( 'autoplaceholder.textos' ) : undefined;

        editor.editing.view.addObserver( ClickObserver );
        this.formView = this._createFormView();
        this._balloon = editor.plugins.get( ContextualBalloon );

        // The "autoplaceholder" dropdown must be registered among the UI components of the editor
        // to be displayed in the toolbar.
        editor.ui.componentFactory.add( 'autoplaceholder', locale => {
            const dropdownView = createDropdown( locale );

            // Populate the list in the dropdown with items.
            addListToDropdown( dropdownView, getDropdownItemsDefinitions( autoplaceholderNames ) );
            dropdownView.buttonView.set( {
                label,
                icon:bracketsIcon,
                tooltip: true,
                withText: true
            });

            // Disable the autoplaceholder button when the command is disabled.
            const command = editor.commands.get( 'autoplaceholder' );
            dropdownView.bind( 'isEnabled' ).to( command );

            // Execute the command when the dropdown item is clicked (executed).
            this.listenTo( dropdownView, 'execute', evt => {
                register['viewElement'] = null;
                let customId = 'autoplaceholder_'+generateId();
                register['attributes'] = {
                    name:'',
                    defaultValue:'',
                    customId,
                    placeholder:evt.source.commandParam
                };

                editor.execute( 'autoplaceholder', { defaultValue:'', placeholder: evt.source.commandParam, id:customId } );

                editor.editing.view.focus();
                this._showUI( true );
            } );

            return dropdownView;
        });

        // Attach lifecycle actions to the the balloon.
        this._enableUserBalloonInteractions();
    }

    destroy() {
        super.destroy();
        this.formView.destroy();
    }

    _createFormView() {
        const editor = this.editor;
        const APCommand = editor.commands.get( 'autoplaceholder' );
        const formView = new AutoPlaceholderFormView( editor.locale, APCommand, this.textos );

        formView.saveButtonView.bind( 'value' ).to( APCommand, 'value' );
        formView.saveButtonView.bind( 'isEnabled' ).to( APCommand );

        this.listenTo( formView, 'submit', () => {
            let command = editor.commands.get( 'autoplaceholder' );
            const selection = editor.model.document.selection;
            const { value } = formView.inputView.fieldView.element;

            let attributes = register['attributes'];
            attributes['name'] = value;
            attributes['defaultValue'] = value;
            editor.execute( 'autoplaceholder', { defaultValue:value, placeholder:attributes.placeholder, id:attributes['customId'] } );
            this._closeFormView();
        
        } );

        this.listenTo( formView, 'cancel', () => {
            this._closeFormView();
        } );

        formView.keystrokes.set( 'Esc', ( data, cancel ) => {
            this._closeFormView();
            cancel();
        } );

        return formView;
    }

    _enableUserBalloonInteractions() {
        const viewDocument = this.editor.editing.view.document;
        let that = this;

        this.listenTo( viewDocument, 'click', evt => {
            that.editor.editing.mapper.on(
                'viewToModelPosition',
                viewToModelPositionOutsideModelElement( that.editor.model, viewElement => {
                    if (viewElement.hasClass( 'autoplaceholder' )) {
                        let command = that.editor.commands.get( 'autoplaceholder' );

                        that.editor.editing.view.focus();
                        //that.editor.setSelection( viewElement, 'on' );
                        that._showUI();

                        let attributes = {
                            name:viewElement.getAttribute('name'), 
                            defaultValue:viewElement.getAttribute('defaultValue'),
                            placeholder:viewElement.getAttribute('placeholder'),
                            id:viewElement.getAttribute('id'),
                            customId:viewElement.getAttribute('customId')
                        };

                        register['attributes'] = attributes;

                        that.formView.inputView.fieldView.value = attributes.name;
                        command.value = attributes.name;
                        
                        register['viewElement'] = viewElement;
                    }
                })
            );
        });

        this.editor.keystrokes.set( 'Esc', ( data, cancel ) => {
                this._hideUI();
                cancel();
        } );

        clickOutsideHandler( {
            emitter: this.formView,
            activator: () => this._isUIInPanel,
            contextElements: [ this._balloon.view.element ],
            callback: () => this._hideUI()
        } );
    }

    _addFormView() {
        if ( this._isFormInPanel ) {
            return;
        }

        const editor = this.editor;
        const APCommand = editor.commands.get( 'autoplaceholder' );

        this.formView.disableCssTransitions();

        this._balloon.add( {
            view: this.formView,
            position: this._getBalloonPositionData()
        } );

        // Select input when form view is currently visible.
        if ( this._balloon.visibleView === this.formView ) {
            this.formView.inputView.fieldView.select();
        }

        this.formView.enableCssTransitions();
        this.formView.inputView.fieldView.element.value = APCommand.value || '';
    }

    _closeFormView() {
        const APCommand = this.editor.commands.get( 'autoplaceholder' );

        if ( APCommand.value !== undefined ) {
            this._removeFormView();
        } else {
            this._hideUI();
        }
    }

    _removeFormView() {
        if ( this._isFormInPanel ) {
            this.formView.saveButtonView.focus();

            this._balloon.remove( this.formView );

            this.editor.editing.view.focus();

        }
    }

    _showUI() {
        this._addFormView();
        this._balloon.showStack( 'main' );

        this._startUpdatingUI();
    }

    _hideUI() {
        if ( !this._isUIInPanel ) {
            return;
        }
        const editor = this.editor;

        this.stopListening( editor.ui, 'update' );
        this.stopListening( this._balloon, 'change:visibleView' );

        editor.editing.view.focus();

        this._removeFormView();

    }

    _startUpdatingUI() {
        const editor = this.editor;
        const viewDocument = editor.editing.view.document;

        let prevSelectedLink = this._getSelectedElement();
        let prevSelectionParent = getSelectionParent();

        const update = () => {
            const selectedLink = this._getSelectedElement();
            const selectionParent = getSelectionParent();

            if ( ( prevSelectedLink && !selectedLink ) ||
                ( !prevSelectedLink && selectionParent !== prevSelectionParent ) ) {
                this._hideUI();
            } else if ( this._isUIVisible ) {
                //this._balloon.updatePosition( this._getBalloonPositionData() );
            }

            prevSelectedLink = selectedLink;
            prevSelectionParent = selectionParent;
        };

        function getSelectionParent() {
            return viewDocument.selection.focus.getAncestors()
                .reverse()
                .find( node => node.is( 'element' ) );
        }

        this.listenTo( editor.ui, 'update', update );
        this.listenTo( this._balloon, 'change:visibleView', update );
    }
    
    get _isUIInPanel() {
        return this._isFormInPanel || this._areActionsInPanel;
    }

    get _isFormInPanel() {
        return this._balloon.hasView( this.formView );
    }

    _getBalloonPositionData() {
        const view = this.editor.editing.view;
        const model = this.editor.model;
        const viewDocument = view.document;
        let target = null;

        if ( model.markers.has( VISUAL_SELECTION_MARKER_NAME ) ) {
            // There are cases when we highlight selection using a marker (#7705, #4721).
            const markerViewElements = Array.from( this.editor.editing.mapper.markerNameToElements( VISUAL_SELECTION_MARKER_NAME ) );
            const newRange = view.createRange(
                view.createPositionBefore( markerViewElements[ 0 ] ),
                view.createPositionAfter( markerViewElements[ markerViewElements.length - 1 ] )
            );

            target = view.domConverter.viewRangeToDom( newRange );
        } else {
            const targetLink = this._getSelectedElement();
            const range = viewDocument.selection.getFirstRange();

            target = targetLink ?
                // When selection is inside link element, then attach panel to this element.
                view.domConverter.mapViewToDom( targetLink ) :
                // Otherwise attach panel to the selection.
                view.domConverter.viewRangeToDom( range );
        }

        return { target };
    }

    _getSelectedElement() {
        const view = this.editor.editing.view;
        const selection = view.document.selection;

        const range = selection.getFirstRange().getTrimmed();
        const startLink = findLinkElementAncestor( range.start );
        const endLink = findLinkElementAncestor( range.end );

        if ( !startLink || startLink != endLink ) {
            return null;
        }

        // Check if the link element is fully selected.
        if ( view.createRangeIn( startLink ).getTrimmed().isEqual( range ) ) {
            return startLink;
        } else {
            return null;
        }
        
    }
}

function findLinkElementAncestor( position ) {
    return position.getAncestors().find( ancestor => isAPElement( ancestor ) );
}

function isAPElement( node ) {
    return node.is( 'attributeElement' ) && !!node.getCustomProperty( 'autoplaceholder' );
}


function getDropdownItemsDefinitions( autoplaceholderNames ) {
    const itemDefinitions = new Collection();

    for ( const token of autoplaceholderNames ) {
        const definition = {
            type: 'button',
            model: new Model( {
                commandParam: token.token.replace(/[\[\]]/ig, ''),
                label: token.name,
                withText: true
            } )
        };

        // Add the item definition to the collection.
        itemDefinitions.add( definition );
    }

    return itemDefinitions;
}

class AutoPlaceholderEditing extends Plugin {
    static get requires() {
        return [ Widget ];
    }

    init() {
        this._defineSchema();
        this._defineConverters();

        this.editor.commands.add( 'autoplaceholder', new AutoPlaceholderCommand( this.editor ) );

        this.editor.editing.mapper.on(
            'viewToModelPosition',
            viewToModelPositionOutsideModelElement( this.editor.model, viewElement => viewElement.hasClass( 'autoplaceholder' ) )
        );
    }

    _defineSchema() {
        const schema = this.editor.model.schema;

        schema.register( 'autoplaceholder', {
            // Allow wherever text is allowed:
            allowWhere: '$text',

            // The autoplaceholder will act as an inline node:
            isInline: true,

            // The inline widget is self-contained so it cannot be split by the caret and it can be selected:
            isObject: true,

            // The autoplaceholder can have many types, like date, name, surname, etc:
            allowAttributes: [ 'placeholder','defaultValue','name','id','customId' ]
        } );
    }

    _defineConverters() {
        const editor = this.editor;
        const conversion = this.editor.conversion;

        editor.conversion.for( 'upcast' )
        .elementToElement( {
            view: {
                name: 'span',
                classes: [ 'autoplaceholder' ]
            },
            model: ( viewElement, { writer: modelWriter } ) => {
                register['attributes'] = {
                    name:viewElement.getAttribute('name'),
                    placeholder:viewElement.getAttribute('placeholder'),
                    id:viewElement.getAttribute('id'),
                    customId:viewElement.getAttribute('customId'),
                    defaultValue:viewElement.getAttribute('name'),
                };

                let autoplaceholder = modelWriter.createElement( 'autoplaceholder', register['attributes'] );

                if (typeof register['elements'] == 'undefined') register['elements'] = [];
                pushElement( autoplaceholder );
                return autoplaceholder;
            }
        });

        conversion.for( 'editingDowncast' ).elementToElement({
            model: 'autoplaceholder',
            view: ( modelItem, { writer: viewWriter } ) => {
                const widgetElement = createAutoPlaceholderView( modelItem, viewWriter );
                // Enable widget handling on a autoplaceholder element inside the editing view.
                return toWidget( widgetElement, viewWriter );
            }
        });

        conversion.for( 'dataDowncast' ).add( dispatcher => {
            dispatcher.on('insert:autoplaceholder', (evt, data, conversionApi) => {
                if (!data.item.getAttribute('customId')) {
                    conversionApi.writer.setAttribute('id', 'autoplaceholder_'+generateId(), data.item) 
                }
            });
        }).elementToElement( {
            model: 'autoplaceholder',
            view: ( modelItem, { writer: viewWriter } ) => createAutoPlaceholderView( modelItem, viewWriter )
        });

    }
}

// Helper method for both downcast converters.
function createAutoPlaceholderView( modelItem, viewWriter ) {
    const name = modelItem.getAttribute('name') || '';
    const placeholder = modelItem.getAttribute('placeholder');
    const id = modelItem.getAttribute('id');
    const customId = modelItem.getAttribute('customId');

    const autoplaceholderView = viewWriter.createEditableElement( 'span', {
        class: 'autoplaceholder',
        placeholder,
        id,
        customId,
        name,
        defaultValue:name
    }, {
        isAllowedInsideAttributeElement: true
    });

    // Insert the autoplaceholder name (as a text).
    const innerText = viewWriter.createText(  '['+ placeholder + ' default="'+ name +'"]' );
    viewWriter.insert( viewWriter.createPositionAt( autoplaceholderView, 0 ), innerText );
    
    return autoplaceholderView;
}

function pushElement( data ) {
    if (!!data.customId) return false;
    let removed = [];
    let elements = [];
    register['elements'].reverse().map( item => { 
        if (typeof item != 'undefined' && data.getAttribute('customId') != item.getAttribute('customId')) { 
            elements.push( item );
        }
    });
    elements.push( data );
    register['elements'] = elements;
}

function generateId() {
    return Math.floor((Math.random() * 1000000) + 1 + Date.now());
}

export default class AutoPlaceholder extends Plugin {
    /**
     * @inheritDoc
     */
    static get requires() {
        return [ AutoPlaceholderEditing, AutoPlaceholderUI ];
    }

    /**
     * @inheritDoc
     */
    static get pluginName() {
        return 'AutoPlaceholder';
    }

}

