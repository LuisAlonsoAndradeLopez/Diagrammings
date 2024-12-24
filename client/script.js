document.addEventListener('DOMContentLoaded', () => {
    // Initialize the Fabric.js canvas
    const diagramsElementsSelectorDivHtmlElement = document.getElementById('diagrams-elements-selector-div');
    const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
    const diagramsElementsEditorDivHtmlElement = document.getElementById('diagrams-elements-editor-div');

    const diagramsMakerCanvas = new fabric.Canvas('diagrams-maker-canvas');

    // Flow Diagram Elements
    const startEndElementImg = document.getElementById('start-end-element-img');
    const inputOutputElementImg = document.getElementById('input-output-element-img');
    const keyboardInputElementImg = document.getElementById('keyboard-input-element-img');
    const actionProcessElementImg = document.getElementById('action-process-element-img');
    const flowElementImg = document.getElementById('flow-element-img');
    const decisionElementImg = document.getElementById('decision-element-img');
    const printerDocumentElementImg = document.getElementById('printer-document-element-img');
    const screenElementImg = document.getElementById('screen-element-img');
    const internalConnectorElementImg = document.getElementById('internal-connector-element-img');
    const externalConnectorElementImg = document.getElementById('external-connector-element-img');

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

    // Add a rectangle to the canvas
    const rect = new fabric.Rect({
        left: 100,
        top: 100,
        fill: 'red',
        width: 100,
        height: 100
    });

    diagramsMakerCanvas.add(rect);

    // Add a circle
    const circle = new fabric.Circle({
        left: 300,
        top: 100,
        fill: 'blue',
        radius: 50
    });
    diagramsMakerCanvas.add(circle);

    // Add text
    const text = new fabric.Text('Hello, Fabric.js!', {
        left: 200,
        top: 300,
        fontSize: 30,
        fill: 'green'
    });
    diagramsMakerCanvas.add(text);

    // Add an image
    fabric.Image.fromURL('https://via.placeholder.com/150', function (img) {
        img.set({
            left: 400,
            top: 200,
            scaleX: 0.5,
            scaleY: 0.5
        });
        diagramsMakerCanvas.add(img);
    });

    // Save canvas state
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Canvas';
    document.body.appendChild(saveButton);

    saveButton.addEventListener('click', () => {
        const canvasState = JSON.stringify(diagramsMakerCanvas);
        localStorage.setItem('canvasState', canvasState);
        alert('Canvas saved!');
    });

    // Load canvas state
    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load Canvas';
    document.body.appendChild(loadButton);

    loadButton.addEventListener('click', () => {
        const canvasState = localStorage.getItem('canvasState');
        if (canvasState) {
            canvas.loadFromJSON(canvasState, canvas.renderAll.bind(diagramsMakerCanvas));
            alert('Canvas loaded!');
        } else {
            alert('No saved canvas state found.');
        }
    });

    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export as Image';
    document.body.appendChild(exportButton);

    exportButton.addEventListener('click', () => {
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1.0
        });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'canvas.png';
        link.click();
    });

    canvas.on('mouse:wheel', function (opt) {
        const delta = opt.e.deltaY;
        const zoom = diagramsMakerCanvas.getZoom();
        diagramsMakerCanvas.setZoom(zoom - delta / 200);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });
});

/*
    // Enable object selection and modification
    rect.set({
    selectable: true
    });
    canvas.renderAll();

    // Listen for events (e.g., object moving)
    canvas.on('object:moving', function(e) {
    console.log('Object is moving:', e.target);
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