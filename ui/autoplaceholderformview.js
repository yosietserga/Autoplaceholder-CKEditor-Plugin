'use strict';
import View from '@ckeditor/ckeditor5-ui/src/view';
import ViewCollection from '@ckeditor/ckeditor5-ui/src/viewcollection';

import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';

import LabeledFieldView from '@ckeditor/ckeditor5-ui/src/labeledfield/labeledfieldview';
import { createLabeledInputText } from '@ckeditor/ckeditor5-ui/src/labeledfield/utils';
import injectCssTransitionDisabler from '@ckeditor/ckeditor5-ui/src/bindings/injectcsstransitiondisabler';

import submitHandler from '@ckeditor/ckeditor5-ui/src/bindings/submithandler';
import FocusTracker from '@ckeditor/ckeditor5-utils/src/focustracker';
import FocusCycler from '@ckeditor/ckeditor5-ui/src/focuscycler';
import KeystrokeHandler from '@ckeditor/ckeditor5-utils/src/keystrokehandler';

import checkIcon from '@ckeditor/ckeditor5-core/theme/icons/check.svg';
import cancelIcon from '@ckeditor/ckeditor5-core/theme/icons/cancel.svg';
import '@ckeditor/ckeditor5-ui/theme/components/responsive-form/responsiveform.css';


export default class AutoPlaceholderFormView extends View {

	constructor( locale, APCommand, textos ) {
		super( locale );

		const t = locale.t;

		const saveText = typeof textos != 'undefined' && typeof textos.save != 'undefined' && textos.save.length > 0 ? textos.save : t('Save');
		const cancelText = typeof textos != 'undefined' && typeof textos.cancel != 'undefined' && textos.cancel.length > 0 ? textos.cancel : t('Cancel');
		const labelText = typeof textos != 'undefined' && typeof textos.label != 'undefined' && textos.label.length > 0 ? textos.label : t( ' Input Placeholder Value' );

		this.labelText = labelText;

		this.focusTracker = new FocusTracker();
		this.keystrokes = new KeystrokeHandler();
		this.inputView = this._createInput();

		this.saveButtonView = this._createButton( saveText, checkIcon, 'ck-button-save' );
		this.saveButtonView.type = 'submit';

		this.cancelButtonView = this._createButton( cancelText, cancelIcon, 'ck-button-cancel', 'cancel' );

		this.children = this._createFormChildren();
		this._focusables = new ViewCollection();

		this._focusCycler = new FocusCycler( {
			focusables: this._focusables,
			focusTracker: this.focusTracker,
			keystrokeHandler: this.keystrokes,
			actions: {
				// Navigate form fields backwards using the Shift + Tab keystroke.
				focusPrevious: 'shift + tab',

				// Navigate form fields forwards using the Tab key.
				focusNext: 'tab'
			}
		} );

		const classList = [ 'ck', 'ck-autoplaceholder-form', 'ck-responsive-form' ];

		this.setTemplate( {
			tag: 'form',
			attributes: {
				class: classList,
				tabindex: '-1'
			},
			children: this.children
		} );

		injectCssTransitionDisabler( this );
	}

	/**
	 * @inheritDoc
	 */
	render() {
		super.render();

		submitHandler( {
			view: this
		} );

		const childViews = [
			this.inputView,
			this.saveButtonView,
			this.cancelButtonView
		];

		childViews.forEach( v => {
			this._focusables.add( v );

			this.focusTracker.add( v.element );
		} );

		this.keystrokes.listenTo( this.element );
	}

	focus() {
		this._focusCycler.focusFirst();
	}

	_createInput() {
		const t = this.locale.t;
		const labeledInput = new LabeledFieldView( this.locale, createLabeledInputText );

		labeledInput.label = this.labelText;

		return labeledInput;
	}

	_createButton( label, icon, className, eventName ) {
		const button = new ButtonView( this.locale );

		button.set( {
			label,
			icon,
			tooltip: true
		} );

		button.extendTemplate( {
			attributes: {
				class: className
			}
		} );

		if ( eventName ) {
			button.delegate( 'execute' ).to( this, eventName );
		}

		return button;
	}

	_createFormChildren() {
		const children = this.createCollection();

		children.add( this.inputView );
		children.add( this.saveButtonView );
		children.add( this.cancelButtonView );

		return children;
	}
}