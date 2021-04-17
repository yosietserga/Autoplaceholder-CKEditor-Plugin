<template>
  <div v-if="currentTutorial" class="edit-form">
    <h4>Tutorial</h4>
    <form>
      <div class="form-group">
        <label for="title">Title</label>
        <input type="text" class="form-control" id="title"
          v-model="currentTutorial.title"
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
          v-model="currentTutorial.description"
          name="description"
        ></ckeditor>

      </div>

      <div class="form-group">
        <label><strong>Status:</strong></label>
        {{ currentTutorial.published ? "Published" : "Pending" }}
      </div>
    </form>

    <button class="badge badge-primary mr-2"
      v-if="currentTutorial.published"
      @click="updatePublished(false)"
    >
      UnPublish
    </button>
    <button v-else class="badge badge-primary mr-2"
      @click="updatePublished(true)"
    >
      Publish
    </button>

    <button class="badge badge-danger mr-2"
      @click="deleteTutorial"
    >
      Delete
    </button>

    <button type="submit" class="badge badge-success"
      @click="updateTutorial"
    >
      Update
    </button>
    <p>{{ message }}</p>
  </div>

  <div v-else>
    <br />
    <p>Please click on a Tutorial...</p>
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
  name: "tutorial",
  components: {
      ckeditor: CKEditor.component
  },
  data() {
    return {
      currentTutorial: null,
      message: '',
        editor: ClassicEditor,
        editorData: 'loading ...',
        editorConfig:config,
    };
  },
  methods: {
    getTutorial(id) {
      TutorialDataService.get(id)
        .then(response => {
          this.currentTutorial = response.data;
          console.log(response.data);
        })
        .catch(e => {
          console.log(e);
        });
    },

    updatePublished(status) {
      var data = {
        id: this.currentTutorial.id,
        title: this.currentTutorial.title,
        //description: this.currentTutorial.description,
        published: status
      };

      TutorialDataService.update(this.currentTutorial.id, data)
        .then(response => {
          this.currentTutorial.published = status;
          console.log(response.data);
        })
        .catch(e => {
          console.log(e);
        });
    },

    updateTutorial() {
      TutorialDataService.update(this.currentTutorial.id, this.currentTutorial)
        .then(response => {
          console.log(response.data);
          this.message = 'The tutorial was updated successfully!';
        })
        .catch(e => {
          console.log(e);
        });
    },

    deleteTutorial() {
      TutorialDataService.delete(this.currentTutorial.id)
        .then(response => {
          console.log(response.data);
          this.$router.push({ name: "tutorials" });
        })
        .catch(e => {
          console.log(e);
        });
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
        CKEDITOR.setData( this.currentTutorial.description );
    },
    onEditorFocus( CKEDITOR ) { CKEDITOR },
    onEditorInput( content ) { content }
  },
  mounted() {
    this.message = '';
    this.getTutorial(this.$route.params.id);
  }
};
</script>

<style>
.edit-form {
  max-width: 300px;
  margin: auto;
}
</style>