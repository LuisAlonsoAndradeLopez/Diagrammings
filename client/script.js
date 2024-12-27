document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('diagramming-content');
  const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
  const diagramsMakerCanvas = new fabric.Canvas(diagramsMakerCanvasHtmlElement);
  const diagramElements = document.querySelectorAll('.diagram-element');

  let selectedCanvasObjects = null;
  let copiedCanvasObjects = null;

  diagramElements.forEach((element) => {
    element.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', event.target.src);
    });
  });

  canvasContainer.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  canvasContainer.addEventListener('drop', (event) => {
    event.preventDefault();

    const imageUrl = event.dataTransfer.getData('text/plain');

    if (!imageUrl) {
      console.error('No image data found in drop event');
      return;
    }

    const rect = diagramsMakerCanvasHtmlElement.getBoundingClientRect();
    const pointerX = event.clientX - (rect.left * 1.15);
    const pointerY = event.clientY - (rect.top * 1.325);

    fabric.Image.fromURL(imageUrl, (img) => {
      img.set({
        left: pointerX,
        top: pointerY,
        selectable: true,
      });

      img.scaleToWidth(100);
      img.scaleToHeight(75);

      diagramsMakerCanvas.add(img);
      diagramsMakerCanvas.renderAll();

      img.on('mousedblclick', () => {
        if (!img.linkedText) {
          const textBox = new fabric.Textbox('Texto', {
            left: img.left + img.width / 2,
            top: img.top + img.height / 2,
            fontSize: 16,
            fontFamily: 'Arial',
            fontStyle: 'normal',
            fontWeight: 'bold',
            textAlign: 'center',
            editable: true,
            borderColor: 'gray',
            cornerColor: 'blue',
            lockUniScaling: true,
            padding: 5,
          });

          diagramsMakerCanvas.add(textBox);
          diagramsMakerCanvas.setActiveObject(textBox);
          diagramsMakerCanvas.renderAll();

          img.linkedText = textBox;
        }
      });

      img.on('moving', () => {
        if (img.linkedText) {
          img.linkedText.left = img.left + 29.5;
          img.linkedText.top = img.top + 29;
          diagramsMakerCanvas.renderAll();
        }
      });
    });
  });

  // Ensure the text box is linked to the image
  diagramsMakerCanvas.on('object:moving', (event) => {
    const obj = event.target;
    if (obj && obj.linkedText) {
      obj.linkedText.left = obj.left + 29.5;
      obj.linkedText.top = obj.top + 29;
      diagramsMakerCanvas.renderAll();
    }
  });

  document.addEventListener('keydown', (event) => {
    selectedCanvasObjects = diagramsMakerCanvas.getActiveObject();

    if (event.ctrlKey && event.key === 'c' && selectedCanvasObjects) {
      copiedCanvasObjects = fabric.util.object.clone(selectedCanvasObjects);
      console.log('Object copied:', copiedCanvasObjects);
    }

    if (event.ctrlKey && event.key === 'v' && copiedCanvasObjects) {
      copiedCanvasObjects.set({
        left: copiedCanvasObjects.left + 30,
        top: copiedCanvasObjects.top + 30
      });

      diagramsMakerCanvas.add(copiedCanvasObjects);
      diagramsMakerCanvas.setActiveObject(copiedCanvasObjects);
      diagramsMakerCanvas.renderAll();

      copiedCanvasObjects = fabric.util.object.clone(copiedCanvasObjects);
      console.log('Object pasted:', copiedCanvasObjects);
    }

    if (event.key === 'Delete' && selectedCanvasObjects) {
      alert('maravitupendo');
      diagramsMakerCanvas.remove(selectedCanvasObjects);
      diagramsMakerCanvas.renderAll();
      console.log('Object deleted');
    }
  });

  const exportButton = document.getElementById('export-button');
  exportButton.addEventListener('click', () => {
    const dataURL = diagramsMakerCanvas.toDataURL({
      format: 'png',
      quality: 1.0
    });

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'canvas.png';
    link.click();
  })
});






/*
document.addEventListener('DOMContentLoaded', function () {
  const diagramsElementsSelectorDivHtmlElement = document.getElementById('diagrams-elements-selector-div');
  const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
  const diagramsElementsEditorDivHtmlElement = document.getElementById('diagrams-elements-editor-div');

  const diagramsMakerCanvas = new fabric.Canvas('diagrams-maker-canvas');

  // Flow Diagram Elements
  const startEndElementImg = document.getElementById('start-end-element-img');
  const inputOutputElementImg = document.getElementById('input-output-element-img');
  const processElementImg = document.getElementById('process-element-img');
  const flowElementImg = document.getElementById('flow-element-img');
  const decisionElementImg = document.getElementById('decision-element-img');
  const documentElementImg = document.getElementById('document-element-img');
  const onPageReferenceElementImg = document.getElementById('on-page-reference-element-img');
  const offPageReferenceElementImg = document.getElementById('off-page-reference-element-img');

  // Use Case Diagram Elements
  const actorElementImg = document.getElementById('actor-element-img');
  const useCaseElementImg = document.getElementById('use-case-element-img');
  const systemElementImg = document.getElementById('system-element-img');
  const associationElementImg = document.getElementById('asociation-element-img');
  const extensionElementImg = document.getElementById('extension-element-img');
  const inclusionElementImg = document.getElementById('inclusion-element-img');
  const generalizationElementImg = document.getElementById('generalization-element-img');

  function resizeCanvas() {
    // Set the canvas size
    diagramsMakerCanvas.setWidth(diagramsMakerCanvasHtmlElement.offsetWidth);
    diagramsMakerCanvas.setHeight(diagramsMakerCanvasHtmlElement.offsetHeight);

    // Optional: Adjust scaling of objects on the canvas
    diagramsMakerCanvas.setZoom(diagramsMakerCanvasHtmlElement.offsetWidth / 700); // Adjust zoom for responsiveness
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

});

*/

/* Código de drag and drop funcional
const canvas = new fabric.Canvas('diagrams-maker-canvas');
   const dragSource = document.getElementById('drag-source');
   
   // Listen for the dragstart event on the drag source element
   dragSource.addEventListener('dragstart', (e) => {
     // Set the data to be transferred (you can pass any kind of data here)
     e.dataTransfer.setData('element', 'rectangle'); // This can be any identifier
   });

   // Listen for the drop event on the Fabric.js canvas
   const canvasContainer = document.getElementById('canvas-container');
   canvasContainer.addEventListener('dragover', (e) => {
     e.preventDefault();  // Allow dropping
   });

   canvasContainer.addEventListener('drop', (e) => {
     e.preventDefault();
     const data = e.dataTransfer.getData('element'); // Get the transferred data

     // Create a new element based on the dragged content (a red rectangle in this case)
     if (data === 'rectangle') {
       const rect = new fabric.Rect({
         left: e.offsetX,
         top: e.offsetY,
         fill: 'red',
         width: 100,
         height: 100
       });

       // Add the rectangle to the Fabric.js canvas
       canvas.add(rect);
     }
   });
 */

/* Código extendido del drag and drop funcional
// Handle image drag event
dragSource.addEventListener('dragstart', (e) => {
e.dataTransfer.setData('element', 'image'); // Pass the image identifier
});

// Handle drop event on Fabric.js canvas
canvasContainer.addEventListener('drop', (e) => {
e.preventDefault();
const data = e.dataTransfer.getData('element'); 

if (data === 'image') {
  const imgElement = new Image();
  imgElement.src = 'path/to/image.png'; // Use the desired image path

  imgElement.onload = function() {
    const img = new fabric.Image(imgElement, {
      left: e.offsetX,
      top: e.offsetY,
      angle: 0,
      opacity: 1
    });
    canvas.add(img);
  };
}
});
 */