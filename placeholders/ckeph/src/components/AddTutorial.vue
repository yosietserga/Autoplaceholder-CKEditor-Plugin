<template>
  <div class="submit-form">
    <div v-if="!submitted">
      <div class="form-group">
        <label for="title">Title</label>
        <input
          type="text"
          class="form-control"
          id="title"
          required
          v-model="tutorial.title"
          name="title"
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>


        <ckeditor 
          :editor="editor" 

          @namespaceloaded="onNamespaceLoaded" 
          @ready="onEditorReady" 
          @focus="onEditorFocus" 
          @input="onEditorInput" 

          :config="editorConfig"

          class="form-control"
          id="description"
          required
          v-model="tutorial.description"
          name="description"
        ></ckeditor>



      </div>

      <button @click="saveTutorial" class="btn btn-success">Submit</button>
    </div>

    <div v-else>
      <h4>You submitted successfully!</h4>
      <button class="btn btn-success" @click="newTutorial">Add</button>
    </div>
  </div>
</template>

<script>
  import TutorialDataService from "../services/TutorialDataService";
  import CKEditor from '@ckeditor/ckeditor5-vue2';
  import CKEditorInspector from '@ckeditor/ckeditor5-inspector';


  
  import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
  import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
  import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
  import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
  import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
  import Link from '@ckeditor/ckeditor5-link/src/link';

  import AutoPlaceholder from 'autoplaceholder/autoplaceholder';
  import tokenList from 'autoplaceholder/samples/tokens';
  
  
  //import ClassicEditor from '@ckeditor/ckeditor5-build-inline';

  let config = {};
  
  config = {
      plugins: [ Essentials, Paragraph, Bold, Italic, Link, AutoPlaceholder ],
      toolbar: [ 'bold', 'italic', 'link', 'rexlink', 'link', 'autoplaceholder' ],
      autoplaceholder: {
        tokenList
      }
  };
  


export default {
  name: "add-tutorial",
  components: {
      ckeditor: CKEditor.component
  },
  data() {
    return {
      tutorial: {
        id: null,
        title: "",
        description: "",
        published: false
      },
      submitted: false,
      editor: ClassicEditor,
      editorData: '<p>Content of the editor.</p>',
      editorConfig:config
    };
  },
  methods: {
    saveTutorial() {
      var data = {
        title: this.tutorial.title,
        description: this.tutorial.description
      };

      TutorialDataService.create(data)
        .then(response => {
          this.tutorial.id = response.data.id;
          console.log(response.data);
          this.submitted = true;
        })
        .catch(e => {
          console.log(e);
        });
    },
    
    newTutorial() {
      this.submitted = false;
      this.tutorial = {};
    },
    onNamespaceLoaded( CKEDITOR ) {
        // Add external `placeholder` plugin which will be available for each
        // editor instance on the page.
        alert('addExternal')
        CKEDITOR.build();
        console.log( CKEDITOR.plugins.addExternal( 'autoplaceholder', "C:/Program Files (x86)/EasyPHP-Devserver-17/eds-www/projects/cke_plugins/placeholders/ckeph/node_modules/autoplaceholder/plugin.js" ) );
        alert('extraPlugins')
        console.log( CKEDITOR.config.extraPlugins = 'autoplaceholder' );
        alert('toolbar')
        console.log( CKEDITOR.config.toolbar = [[ 'autoplaceholder' ]] );
        alert('plugins')
        console.log( CKEDITOR.plugins );
        alert('plugins')


    },
    onEditorReady( CKEDITOR ) { 
        CKEditorInspector.attach( CKEDITOR );
    },
    onEditorFocus( CKEDITOR ) { CKEDITOR },
    onEditorInput( content ) { content },
  }
};
</script>

<style>
.submit-form {
  max-width: 300px;
  margin: auto;
}
</style>