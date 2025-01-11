import { socket } from './diagrammings_server_connection.js';

const helpButton = document.getElementById('help-button');
const exportButton = document.getElementById('export-button');
const canvasContainer = document.getElementById('diagramming-content');
const diagramsElementsEditorDiv = document.getElementById('diagrams-elements-editor-div');
const nonSelectedImageDiv = document.getElementById('non-selected-image-div');
const selectedImageDiv = document.getElementById('selected-image-div');
const textH2 = document.getElementById('text-h2');
const selectedElementTextInputDiv = document.getElementById('selected-element-text-input-div');
const selectedElementTextInput = document.getElementById('selected-element-text-input');
const textModifiersDiv = document.getElementById('text-modifiers-div');
const textAlignLeftButton = document.getElementById('text-align-left-button');
const textAlignCenterButton = document.getElementById('text-align-center-button');
const textAlignRightButton = document.getElementById('text-align-right-button');
const textAlignJustifyButton = document.getElementById('text-align-justify-button');
const textFontSizeInput = document.getElementById('text-font-size-input');
const includeExtendsInputsDiv = document.getElementById('include-extends-inputs-div');
const includeInput = document.getElementById('include-input');
const extendsInput = document.getElementById('extends-input');
const positioningDiv = document.getElementById('positioning-div');
const setElementsInFrontOfButton = document.getElementById('set-elements-in-front-of-button');
const setElementsBehindButton = document.getElementById('set-elements-behind-button');
const setElementsInFrontButton = document.getElementById('set-elements-in-front-button');
const setElementsAtTheBottomButton = document.getElementById('set-elements-at-the-bottom-button');

const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
const diagramsMakerCanvas = new fabric.Canvas(diagramsMakerCanvasHtmlElement);

const diagramElements = document.querySelectorAll('.diagram-element');

const userId = Math.random().toString(36).substring(2, 15);

let canvasHistory = [];
let canvasHistoryRedo = [];

let canvasZoomLevel = 1;
let canvasIsPanning = false;
let canvasLastPanPosition = { x: 0, y: 0 };

let previouslySelectedObjects = [];
let selectedCanvasObjectsForEdit = [];
let selectedCanvasObjectsForDelete = [];
let copiedOrCutCanvasObjects = [];

let connectedRemoteCursors = {};

const aboveImages = ['system.png'];

const belowImages = ['actor.png', 'dependency.png'];

const centeredImages = [
  'decision.png', 'document.png', 'input_output.png', 'off_page_reference.png', 'on_page_reference.png',
  'process.png', 'start_end.png', 'use_case.png'
];

const includeAndExtendsTextImages = ['dependency.png'];

const normalTextImages = [
  'actor.png', 'decision.png', 'document.png', 'input_output.png', 'off_page_reference.png', 'on_page_reference.png',
  'process.png', 'start_end.png', 'system.png', 'use_case.png'
];

const notRotatingImages = [
  'actor.png', 'decision.png', 'document.png', 'input_output.png', 'off_page_reference.png', 'on_page_reference.png',
  'process.png', 'start_end.png', 'system.png', 'use_case.png'
];

const notScalingImages = [
  'actor.png', 'off_page_reference.png', 'on_page_reference.png'
];

const notScalingXAndYImages = [
  'decision.png', 'document.png', 'input_output.png', 'process.png', 'start_end.png', 'use_case.png'
];

const notScalingYAndFlipImages = [
  'asociation.png', 'dependency.png', 'generalization.png', 'flow.png'
];

const notTextImages = [
  'asociation.png', 'generalization.png', 'flow.png'
];

let mousePointer = null;

document.addEventListener('DOMContentLoaded', () => {
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

    selectedCanvasObjectsForEdit = [];
    selectedCanvasObjectsForDelete = [];

    mousePointer = diagramsMakerCanvas.getPointer(event);

    const imageUrl = event.dataTransfer.getData('text/plain');

    if (!imageUrl) {
      console.error('No image data found in drop event');
      return;
    }

    fabric.Image.fromURL(imageUrl, (img) => {
      let textBox;
      img.imageUrl = imageUrl.split('/').pop();

      setCanvasDiagramElementAttributes(img);

      const fineScaleX = Math.round(img.scaleX * 100) / 100;
      const fineScaleY = Math.round(img.scaleY * 100) / 100;

      img.set({
        left: mousePointer.x - img.getScaledWidth() / 2,
        top: mousePointer.y - img.getScaledHeight() / 2,
        scaleX: fineScaleX,
        scaleY: fineScaleY
      });

      img.scaleToWidth(img.width * img.scaleX);
      img.scaleToHeight(img.height * img.scaleY);

      if (!notTextImages.includes(img.imageUrl)) {
        textBox = new fabric.Textbox('Texto');
        setCanvasDiagramElementTextBoxAttributes(textBox);

        if (includeAndExtendsTextImages.includes(img.imageUrl)) {
          textBox.set({
            text: '<<include>>',
            editable: true,
            event: true,
            hasControls: true,
            hasBorders: true,
            selectable: true
          });

          textBox.setControlsVisibility({
            mtr: false,
            mt: false,
            mb: false,
            ml: false,
            mr: false,
            bl: true,
            br: true,
            tl: true,
            tr: true
          });
        }

        img.linkedText = textBox;

      }

      setCombinedCanvasDiagramElementAndTextBoxAttributes(img);
      diagramsMakerCanvas.add(img);

      if (img.linkedText) {
        diagramsMakerCanvas.add(textBox);
        img.linkedText.bringForward();
      }

      diagramsMakerCanvas.setActiveObject(img);
      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();
      previouslySelectedObjects = diagramsMakerCanvas.getActiveObjects();
      socket.send(JSON.stringify({ type: "lock", objects: previouslySelectedObjects }));
    });
  });

  diagramsElementsEditorDiv.addEventListener('click', () => {
    diagramsMakerCanvas.discardActiveObject();
  });

  diagramsMakerCanvas.on('mouse:down', (event) => {
    if (event.e.ctrlKey) {
      canvasIsPanning = true;
      canvasLastPanPosition.x = event.e.clientX;
      canvasLastPanPosition.y = event.e.clientY;
      diagramsMakerCanvas.selection = false;
    }
  });

  diagramsMakerCanvas.on('mouse:move', (event) => {
    mousePointer = diagramsMakerCanvas.getPointer(event.e);

    if (canvasIsPanning) {
      const dx = event.e.clientX - canvasLastPanPosition.x;
      const dy = event.e.clientY - canvasLastPanPosition.y;

      diagramsMakerCanvas.relativePan({ x: dx, y: dy });

      canvasLastPanPosition.x = event.e.clientX;
      canvasLastPanPosition.y = event.e.clientY;
    }

    const cursorData = {
      x: mousePointer.x,
      y: mousePointer.y,
      userId: userId,
    };

    // Send cursor data to the WebSocket server
    socket.send(JSON.stringify({ type: "cursorData", objects: cursorData }));
  });

  diagramsMakerCanvas.on('mouse:up', () => {
    canvasIsPanning = false;
    diagramsMakerCanvas.selection = true; // Re-enable object selection
  });

  diagramsMakerCanvas.on('object:added', (event) => {
    const addedObject = event.target;
    updateLinkedTextPositionForCanvasElement(addedObject);
    diagramsMakerCanvas.renderAll();
  });

  diagramsMakerCanvas.on('object:moving', (event) => {
    handleCanvasObjectEvent(event);
    diagramsMakerCanvas.renderAll();
  });

  diagramsMakerCanvas.on('object:modified', (event) => {
    handleCanvasObjectEvent(event);
    diagramsMakerCanvas.renderAll();
    canvasHistory.push(diagramsMakerCanvas.toJSON());
    sendCurrentCanvasStateToAllConnectedClients();
  });

  diagramsMakerCanvas.on('selection:cleared', () => {
    const deselectedObjects = previouslySelectedObjects;
    socket.send(JSON.stringify({ type: "unlock", objects: deselectedObjects }));
    previouslySelectedObjects = [];

    diagramsMakerCanvas.getObjects('image').forEach((img) => {
      updateLinkedTextPositionForCanvasElement(img);

      if (img.linkedText) {
        img.linkedText.evented = false;
        img.linkedText.visible = true;
      }
    });

    diagramsMakerCanvas.renderAll();
    selectedCanvasObjectsForDelete = [];
  });

  diagramsMakerCanvas.on('selection:created', (event) => {
    console.log("de burro");
    lockSelectionControls();
    previouslySelectedObjects = event.selected;
    socket.send(JSON.stringify({ type: "lock", objects: previouslySelectedObjects }));
  });


  diagramsMakerCanvas.on('selection:updated', (event) => {
    console.log("Pene");
    lockSelectionControls();
    previouslySelectedObjects = event.selected;
    socket.send(JSON.stringify({ type: "lock", objects: previouslySelectedObjects }));
  });

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      if (canvasHistory.length > 1) {
        const currentState = canvasHistory.pop();
        canvasHistoryRedo.push(currentState);

        const jsonObjects = canvasHistory[canvasHistory.length - 1].objects;
        clearCanvas();
        generateCanvasElementsFromCanvasState(jsonObjects);
        diagramsMakerCanvas.renderAll();
        sendCurrentCanvasStateToAllConnectedClients();
      }
    }

    if (event.ctrlKey && event.key === 'y') {
      event.preventDefault();
      if (canvasHistoryRedo.length > 0) {
        const jsonObjects = canvasHistoryRedo[canvasHistoryRedo.length - 1].objects;
        const nextState = canvasHistoryRedo.pop();
        canvasHistory.push(nextState);

        clearCanvas();
        generateCanvasElementsFromCanvasState(jsonObjects);
        diagramsMakerCanvas.renderAll();
      }
    }

    if (event.ctrlKey && event.key === 'c' && diagramsMakerCanvas.getActiveObjects().length > 0) {
      copiedOrCutCanvasObjects = [];

      diagramsMakerCanvas.getActiveObjects().forEach((img) => {
        img.clone((clonedImg) => {
          clonedImg.imageUrl = img.imageUrl;
          setCanvasDiagramElementAttributes(clonedImg);

          clonedImg.set({
            scaleX: img.scaleX,
            scaleY: img.scaleY,
            width: img.width,
            height: img.height
          });

          const originalScaledWidth = img.getScaledWidth();
          const originalScaledHeight = img.getScaledHeight();

          const clonedScaledWidth = clonedImg.getScaledWidth();
          const clonedScaledHeight = clonedImg.getScaledHeight();

          // Force synchronization if there is any mismatch
          if (Math.abs(originalScaledWidth - clonedScaledWidth) > 0.0001 ||
            Math.abs(originalScaledHeight - clonedScaledHeight) > 0.0001) {
            clonedImg.scaleToWidth(originalScaledWidth);
            clonedImg.scaleToHeight(originalScaledHeight);
          }

          if (img.linkedText) {
            img.linkedText.clone((clonedTextBox) => {
              setCanvasDiagramElementTextBoxAttributes(clonedTextBox);
              clonedTextBox.set({
                left: img.linkedText.left,
                top: img.linkedText.top,
                fontSize: img.linkedText.fontSize,
                textAlign: img.linkedText.textAlign
              });

              clonedImg.linkedText = clonedTextBox;
              setCombinedCanvasDiagramElementAndTextBoxAttributes(clonedImg);

              copiedOrCutCanvasObjects.push({ object: clonedImg, objectImageUrl: img.imageUrl, text: clonedTextBox });
            });
          } else {
            setCombinedCanvasDiagramElementAndTextBoxAttributes(clonedImg);
            copiedOrCutCanvasObjects.push({ object: clonedImg, objectImageUrl: img.imageUrl });
          }
        });
      });
    }

    if (event.ctrlKey && event.key === 'x' && diagramsMakerCanvas.getActiveObjects().length > 0) {
      copiedOrCutCanvasObjects = [];

      diagramsMakerCanvas.getActiveObjects().forEach((img) => {
        img.clone((clonedImg) => {
          clonedImg.imageUrl = img.imageUrl;
          setCanvasDiagramElementAttributes(clonedImg);

          clonedImg.set({
            scaleX: img.scaleX,
            scaleY: img.scaleY,
            width: img.width,
            height: img.height
          });

          const originalScaledWidth = img.getScaledWidth();
          const originalScaledHeight = img.getScaledHeight();

          const clonedScaledWidth = clonedImg.getScaledWidth();
          const clonedScaledHeight = clonedImg.getScaledHeight();

          // Force synchronization if there is any mismatch
          if (Math.abs(originalScaledWidth - clonedScaledWidth) > 0.0001 ||
            Math.abs(originalScaledHeight - clonedScaledHeight) > 0.0001) {
            clonedImg.scaleToWidth(originalScaledWidth);
            clonedImg.scaleToHeight(originalScaledHeight);
          }

          if (img.linkedText) {
            img.linkedText.clone((clonedTextBox) => {
              setCanvasDiagramElementTextBoxAttributes(clonedTextBox);
              clonedTextBox.set({
                left: img.linkedText.left,
                top: img.linkedText.top,
                fontSize: img.linkedText.fontSize,
                textAlign: img.linkedText.textAlign
              });

              clonedImg.linkedText = clonedTextBox;
              setCombinedCanvasDiagramElementAndTextBoxAttributes(clonedImg, clonedTextBox);

              copiedOrCutCanvasObjects.push({ object: clonedImg, objectImageUrl: img.imageUrl, text: clonedTextBox });
              diagramsMakerCanvas.remove(img.linkedText);
            });
          } else {
            setCombinedCanvasDiagramElementAndTextBoxAttributes(clonedImg);
            copiedOrCutCanvasObjects.push({ object: clonedImg, objectImageUrl: img.imageUrl });
          }

          diagramsMakerCanvas.remove(img);
          diagramsMakerCanvas.discardActiveObject();
        });
      });

      sendCurrentCanvasStateToAllConnectedClients();

      nonSelectedImageDiv.style.display = 'block';
      selectedImageDiv.style.display = 'none';
    }

    if (event.ctrlKey && event.key === 'v' && copiedOrCutCanvasObjects.length > 0) {
      const pastedObjects = [];

      copiedOrCutCanvasObjects.forEach((copiedObj, index) => {
        const clonedObj = copiedObj.object;
        const clonedObjImageUrl = copiedObj.objectImageUrl;

        clonedObj.clone((pastedImg) => {
          pastedImg.imageUrl = clonedObjImageUrl;
          setCanvasDiagramElementAttributes(pastedImg);

          pastedImg.set({
            scaleX: clonedObj.scaleX,
            scaleY: clonedObj.scaleY,
            left: clonedObj.left + 10,
            top: clonedObj.top + 10,
            width: clonedObj.width,
            height: clonedObj.height
          });

          const originalScaledWidth = clonedObj.getScaledWidth();
          const originalScaledHeight = clonedObj.getScaledHeight();

          const clonedScaledWidth = pastedImg.getScaledWidth();
          const clonedScaledHeight = pastedImg.getScaledHeight();

          // Force synchronization if there is any mismatch
          if (Math.abs(originalScaledWidth - clonedScaledWidth) > 0.0001 ||
            Math.abs(originalScaledHeight - clonedScaledHeight) > 0.0001) {
            pastedImg.scaleToWidth(originalScaledWidth);
            pastedImg.scaleToHeight(originalScaledHeight);
          }

          if (copiedObj.text) {
            copiedObj.text.clone((pastedTextBox) => {
              setCanvasDiagramElementTextBoxAttributes(pastedTextBox);
              pastedTextBox.set({
                left: copiedObj.text.left,
                top: copiedObj.text.top,
                fontSize: copiedObj.text.fontSize,
                textAlign: copiedObj.text.textAlign
              });

              pastedImg.linkedText = pastedTextBox;
              setCombinedCanvasDiagramElementAndTextBoxAttributes(pastedImg);
              diagramsMakerCanvas.add(pastedTextBox);
            });
          } else {
            setCombinedCanvasDiagramElementAndTextBoxAttributes(pastedImg);
          }

          diagramsMakerCanvas.add(pastedImg);

          if (pastedImg.linkedText) {
            pastedImg.linkedText.bringForward();
          }

          pastedObjects.push(pastedImg)
          diagramsMakerCanvas.renderAll();


          if (index === copiedOrCutCanvasObjects.length - 1) {
            // Wait for all elements to be added before grouping them
            setTimeout(() => {
              const selection = new fabric.ActiveSelection(pastedObjects, {
                canvas: diagramsMakerCanvas,
              });
              diagramsMakerCanvas.setActiveObject(selection);
              diagramsMakerCanvas.renderAll();

              const boundingBox = selection.getBoundingRect();
              const offsetX = mousePointer.x - (boundingBox.left + boundingBox.width / 2);
              const offsetY = mousePointer.y - (boundingBox.top + boundingBox.height / 2);

              pastedObjects.forEach((obj) => {
                obj.left += offsetX;
                obj.top += offsetY;
                obj.setCoords();

                updateLinkedTextPositionForCanvasElement(obj);
              });

              diagramsMakerCanvas.discardActiveObject();
              diagramsMakerCanvas.renderAll();

              const finalSelection = new fabric.ActiveSelection(pastedObjects, {
                canvas: diagramsMakerCanvas,
              });

              diagramsMakerCanvas.setActiveObject(finalSelection);
              diagramsMakerCanvas.renderAll();
            }, 0);
          }
        });
      });

      previouslySelectedObjects = pastedObjects;
      socket.send(JSON.stringify({ type: "lock", objects: previouslySelectedObjects }));
    }

    if (event.key === 'Backspace' && selectedCanvasObjectsForDelete.length > 0) {
      selectedCanvasObjectsForDelete.forEach((obj) => {
        if (obj.type === 'image') {
          diagramsMakerCanvas.remove(obj);

          if (obj.linkedText) {
            diagramsMakerCanvas.remove(obj.linkedText);
          }
        }

        diagramsMakerCanvas.discardActiveObject();
        diagramsMakerCanvas.renderAll();
      });

      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();

      nonSelectedImageDiv.style.display = 'block';
      selectedImageDiv.style.display = 'none';

      selectedCanvasObjectsForDelete = [];
    }

    if (event.key === '+') {
      zoomCanvas(1.1); // Zoom in
    } else if (event.key === '-') {
      zoomCanvas(0.9); // Zoom out
    }
  });

  helpButton.addEventListener('click', () => {
    alert(`
      *Callback cuando elemento cambia de posicionamiento bien por favor (borones en frente, atras, etc).
      *Cuando un cliente se desconecta, el cursor del cliente desconectado debe desaparecer de todos los clientes.
      *Selección y deselección de elementos entre clientes bien hecho por favor.
      *No hay buen callback cuando los elementos se giran.

      *Ctrl + Z: Revertir cambios.
      *Ctrl + Y: Recuperar elementos de la reversión de cambios. 
      *Ctrl + C: Copiar elementos seleccionados.
      *Ctrl + X: Cortar elementos seleccionados.
      *Ctrl + V: Pegar elementos copiados.
      *Backspace: Eliminar elementos seleccionados.
      *+: Agrandar el zoom del canvas.
      *-: Minimizar el zoom del canvas.
      *Ctrl + Click y mover el cursor: Mover el canvas.
    `);
  });

  exportButton.addEventListener('click', () => {
    Object.values(connectedRemoteCursors).forEach(obj => diagramsMakerCanvas.remove(obj));

    if (diagramsMakerCanvas.getObjects().length > 0) {
      const originalWidth = diagramsMakerCanvas.getWidth();
      const originalHeight = diagramsMakerCanvas.getHeight();
      const originalZoom = diagramsMakerCanvas.getZoom();

      diagramsMakerCanvas.setZoom(1);

      const objects = diagramsMakerCanvas.getObjects();
      const bounds = objects.reduce(
        (acc, obj) => {
          const objWidth = obj.width * obj.scaleX; // Account for scaling
          const objHeight = obj.height * obj.scaleY;
          acc.minX = Math.min(acc.minX, obj.left);
          acc.minY = Math.min(acc.minY, obj.top);
          acc.maxX = Math.max(acc.maxX, obj.left + objWidth);
          acc.maxY = Math.max(acc.maxY, obj.top + objHeight);
          return acc;
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );

      const newWidth = bounds.maxX - bounds.minX;
      const newHeight = bounds.maxY - bounds.minY;
      diagramsMakerCanvas.setDimensions({ width: newWidth, height: newHeight });

      objects.forEach((obj) => {
        obj.left -= bounds.minX;
        obj.top -= bounds.minY;
        obj.setCoords(); // Update object coordinates
      });

      const background = new fabric.Rect({
        left: 0,
        top: 0,
        width: newWidth,
        height: newHeight,
        fill: '#ffffff', // Background color
        selectable: false,
        evented: false,
      });
      diagramsMakerCanvas.add(background);
      diagramsMakerCanvas.sendToBack(background);
      diagramsMakerCanvas.renderAll();

      const dataURL = diagramsMakerCanvas.toDataURL({
        format: 'png'
      });

      diagramsMakerCanvas.remove(background);

      diagramsMakerCanvas.setDimensions({ width: originalWidth, height: originalHeight });
      diagramsMakerCanvas.setZoom(originalZoom);

      objects.forEach((obj) => {
        obj.left += bounds.minX;
        obj.top += bounds.minY;
        obj.setCoords();
      });

      Object.values(connectedRemoteCursors).forEach(obj => diagramsMakerCanvas.add(obj));

      diagramsMakerCanvas.renderAll();

      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'Diagramming Canvas.png';
      link.click();
    } else {
      alert('No se puede exportar un diagrama vacío.');
    }
  });

  includeInput.addEventListener('click', () => {
    if (selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text !== "<<include>>") {
      extendsInput.checked = false;
      selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text = "<<include>>";
      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();
    }
  });

  extendsInput.addEventListener('click', () => {
    if (selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text !== "<<extends>>") {
      includeInput.checked = false;
      selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text = "<<extends>>";
      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();
    }
  });

  selectedElementTextInput.addEventListener('input', () => {
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text = selectedElementTextInput.value;
    updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
    canvasHistory.push(diagramsMakerCanvas.toJSON());
    sendCurrentCanvasStateToAllConnectedClients();
  });

  setElementsInFrontOfButton.addEventListener('click', () => {
    const canvasObjects = diagramsMakerCanvas.getObjects();
    const objectForBringForward = selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1];
    const selectedObjectOnCanvasObjectsIndex = canvasObjects.indexOf(objectForBringForward);
    const objectForComparisionBetweenTheLinkedTextObject = canvasObjects[selectedObjectOnCanvasObjectsIndex + 2];
    const objectForComparisionBetweenTheNotLinkedTextObject = canvasObjects[selectedObjectOnCanvasObjectsIndex + 1];

    if (objectForBringForward.linkedText) {
      if (objectForComparisionBetweenTheLinkedTextObject) {
        if (objectForComparisionBetweenTheLinkedTextObject.linkedText) {
          diagramsMakerCanvas.bringForward(objectForBringForward.linkedText);
          diagramsMakerCanvas.bringForward(objectForBringForward.linkedText);
          diagramsMakerCanvas.bringForward(objectForBringForward);
          diagramsMakerCanvas.bringForward(objectForBringForward);
        } else {
          diagramsMakerCanvas.bringForward(objectForBringForward.linkedText);
          diagramsMakerCanvas.bringForward(objectForBringForward);
        }
      }
    } else {
      if (objectForComparisionBetweenTheNotLinkedTextObject) {
        if (objectForComparisionBetweenTheNotLinkedTextObject.linkedText) {
          diagramsMakerCanvas.bringForward(objectForBringForward);
          diagramsMakerCanvas.bringForward(objectForBringForward);
        } else {
          diagramsMakerCanvas.bringForward(objectForBringForward);
        }
      }
    }

    diagramsMakerCanvas.renderAll();
    sendCurrentCanvasStateToAllConnectedClients();
  });

  setElementsBehindButton.addEventListener('click', () => {
    const canvasObjects = diagramsMakerCanvas.getObjects();
    const objectForBringBackwards = selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1];
    const selectedObjectOnCanvasObjectsIndex = canvasObjects.indexOf(objectForBringBackwards);
    const objectForComparision = canvasObjects[selectedObjectOnCanvasObjectsIndex - 2];

    if (objectForBringBackwards.linkedText) {
      if (objectForComparision) {
        if (objectForComparision.linkedText) {
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards);
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards);
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards.linkedText);
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards.linkedText);
        } else {
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards);
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards.linkedText);
        }
      }
    } else {
      if (objectForComparision) {
        if (objectForComparision.linkedText) {
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards);
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards);
        } else {
          diagramsMakerCanvas.sendBackwards(objectForBringBackwards);
        }
      }
    }

    diagramsMakerCanvas.renderAll();
    sendCurrentCanvasStateToAllConnectedClients();
  });

  setElementsInFrontButton.addEventListener('click', () => {
    diagramsMakerCanvas.bringToFront(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.bringToFront(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText);
    diagramsMakerCanvas.renderAll();
    sendCurrentCanvasStateToAllConnectedClients();
  });

  setElementsAtTheBottomButton.addEventListener('click', () => {
    diagramsMakerCanvas.sendToBack(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText);
    diagramsMakerCanvas.sendToBack(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
    sendCurrentCanvasStateToAllConnectedClients();
  });

  textAlignLeftButton.addEventListener('click', () => {
    if (selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign !== 'left') {
      selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign = 'left';
      updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();
    }
  });

  textAlignCenterButton.addEventListener('click', () => {
    if (selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign !== 'center') {
      selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign = 'center';
      updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();
    }
  });

  textAlignRightButton.addEventListener('click', () => {
    if (selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign !== 'right') {
      selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign = 'right';
      updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();
    }
  });

  textAlignJustifyButton.addEventListener('click', () => {
    if (selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign !== 'justify') {
      selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign = 'justify';
      updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();
    }
  });

  textFontSizeInput.addEventListener('keydown', (event) => {
    const allowedKeys = [
      'ArrowUp', 'ArrowDown', 'Backspace', 'Tab', 'Delete', 'Enter'
    ];

    if (!allowedKeys.includes(event.key) && (event.key < '0' || event.key > '9')) {
      event.preventDefault();
    }
  });

  textFontSizeInput.addEventListener('input', () => {
    if (textFontSizeInput.value < 8) {
      textFontSizeInput.value = 8;
    }

    if (textFontSizeInput.value > 32) {
      textFontSizeInput.value = 32;
    }

    if (selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.fontSize !== textFontSizeInput.value) {
      selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.fontSize = textFontSizeInput.value;
      updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
      diagramsMakerCanvas.renderAll();
      canvasHistory.push(diagramsMakerCanvas.toJSON());
      sendCurrentCanvasStateToAllConnectedClients();
    }
  });

  canvasHistory.push(diagramsMakerCanvas.toJSON());
});


//This function can be used in the current file and diagrammings_server_connection
export function generateCanvasElementsFromCanvasState(jsonObjects) {
  jsonObjects.forEach((obj, index) => {
    if (obj.type === 'image') {
      fabric.Image.fromURL(obj.src, (img) => {
        img.set({
          imageUrl: obj.src.split('/').pop()
        });

        let imgLinkedTextBox;
        setCanvasDiagramElementAttributes(img);

        img.set({
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          left: obj.left,
          top: obj.top,
          width: obj.width,
          height: obj.height
        });

        const originalScaledWidth = obj.width * obj.scaleX;
        const originalScaledHeight = obj.height * obj.scaleY;

        const clonedScaledWidth = img.getScaledWidth();
        const clonedScaledHeight = img.getScaledHeight();

        // Force synchronization if there is any mismatch
        if (Math.abs(originalScaledWidth - clonedScaledWidth) > 0.0001 ||
          Math.abs(originalScaledHeight - clonedScaledHeight) > 0.0001) {
          img.scaleToWidth(originalScaledWidth);
          img.scaleToHeight(originalScaledHeight);
        }

        if (jsonObjects[index + 1] && jsonObjects[index + 1].type === 'textbox') {
          imgLinkedTextBox = new fabric.Textbox(jsonObjects[index + 1].text);
          setCanvasDiagramElementTextBoxAttributes(imgLinkedTextBox);

          imgLinkedTextBox.set({
            fontSize: jsonObjects[index + 1].fontSize,
            textAlign: jsonObjects[index + 1].textAlign
          });

          if (includeAndExtendsTextImages.includes(img.imageUrl)) {
            imgLinkedTextBox.set({
              editable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              selectable: true
            });

            imgLinkedTextBox.setControlsVisibility({
              mtr: false,
              mt: false,
              mb: false,
              ml: false,
              mr: false,
              bl: true,
              br: true,
              tl: true,
              tr: true,
            });
          }

          img.linkedText = imgLinkedTextBox;

        }

        setCombinedCanvasDiagramElementAndTextBoxAttributes(img);
        diagramsMakerCanvas.add(img);

        if (img.linkedText) {
          diagramsMakerCanvas.add(imgLinkedTextBox);
          img.linkedText.bringForward();
        }

        diagramsMakerCanvas.renderAll();

      });
    }
  });
}

function handleCanvasObjectEvent(event) {
  const selectedElements = event.target;

  if (selectedElements.type === 'activeSelection') {
    selectedElements._objects.forEach((obj) => {
      if (obj.linkedText && !includeAndExtendsTextImages.includes(obj.imageUrl)) {
        obj.linkedText.visible = false;
      }
    });
  } else if (selectedElements.linkedText && !includeAndExtendsTextImages.includes(selectedElements.imageUrl)) {
    updateLinkedTextPositionForCanvasElement(selectedElements);
  }
}

function lockSelectionControls() {
  const activeObject = diagramsMakerCanvas.getActiveObject();

  if (activeObject && activeObject.type === 'activeSelection') {
    activeObject.set({
      hasControls: false, // No rotation/scaling controls
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });

    activeObject.getObjects().forEach((obj) => {
      obj.set({
        lockMovementX: false,
        lockMovementY: false,
        selectable: true,
        evented: true,
      });
    });

    diagramsMakerCanvas.renderAll();
  }
}

function setCanvasDiagramElementAttributes(img) {
  img.scaleToWidth(100);
  img.scaleToHeight(75);

  if (notRotatingImages.includes(img.imageUrl)) {
    img.set({
      selectable: true,
      fill: 'black'
    });

    img.set({
      hasRotatingPoint: false,
      lockRotation: true
    });

    img.setControlsVisibility({
      mtr: false
    });
  }

  if (notScalingImages.includes(img.imageUrl)) {
    img.set({ hasControls: false });
  }

  if (notScalingXAndYImages.includes(img.imageUrl)) {
    img.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
      bl: true,
      br: true,
      tl: true,
      tr: true
    });
  }

  if (notScalingYAndFlipImages.includes(img.imageUrl)) {
    img.setControlsVisibility({
      mt: false,
      mb: false,
      ml: true,
      mr: true,
      bl: false,
      br: false,
      tl: false,
      tr: false
    });
  }
}

function setCanvasDiagramElementTextBoxAttributes(textBox) {
  textBox.set({
    width: 100 * 0.75,
    height: 75,
    fontSize: 16,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    fontWeight: 'bold',
    textAlign: 'center',
    borderColor: 'gray',
    cornerColor: 'blue',
    visible: true,
    editable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    selectable: false,
    padding: 5
  });
}

function setCombinedCanvasDiagramElementAndTextBoxAttributes(img) {
  img.on('scaling', () => {
    if (img.linkedText) {
      img.linkedText.set({
        width: img.getScaledWidth() * 0.75,
        height: img.getScaledHeight()
      });

      if (!includeAndExtendsTextImages.includes(img.imageUrl)) {
        updateLinkedTextPositionForCanvasElement(img);
      }
    }
  });

  img.on('rotating', () => {
    if (img.linkedText && !includeAndExtendsTextImages.includes(img.imageUrl)) {
      updateLinkedTextPositionForCanvasElement(img);
    }
  });

  img.on('selected', () => {
    const activeObjects = diagramsMakerCanvas.getActiveObjects();

    if (selectedCanvasObjectsForEdit.includes(img)) {
      const index = selectedCanvasObjectsForEdit.indexOf(img);
      if (index !== -1) {
        selectedCanvasObjectsForEdit.splice(index, 1);
      }
    }

    if (img.linkedText && !includeAndExtendsTextImages.includes(img.imageUrl)) {
      selectedElementTextInput.value = img.linkedText.text;
      textFontSizeInput.value = img.linkedText.fontSize;

      if (activeObjects.length === 1) {
        updateLinkedTextPositionForCanvasElement(img);
      }
    }

    selectedCanvasObjectsForEdit.push(img);
    selectedCanvasObjectsForDelete.push(img);

    if (activeObjects.length > 1) {
      nonSelectedImageDiv.style.display = 'block';
      selectedImageDiv.style.display = 'none';
      return;
    }

    if (normalTextImages.includes(img.imageUrl)) {
      textH2.style.display = 'flex';
      selectedElementTextInputDiv.style.display = 'flex';
      textModifiersDiv.style.display = 'flex';
      includeExtendsInputsDiv.style.display = 'none';
      positioningDiv.style.display = 'block';
    }

    if (notTextImages.includes(img.imageUrl)) {
      textH2.style.display = 'none';
      selectedElementTextInputDiv.style.display = 'none';
      textModifiersDiv.style.display = 'none';
      includeExtendsInputsDiv.style.display = 'none';
      positioningDiv.style.display = 'block';
    }

    if (includeAndExtendsTextImages.includes(img.imageUrl)) {
      textH2.style.display = 'flex';
      selectedElementTextInputDiv.style.display = 'none';
      textModifiersDiv.style.display = 'none';
      includeExtendsInputsDiv.style.display = 'flex';
      positioningDiv.style.display = 'block';

      if (img.linkedText.text === "<<include>>") {
        includeInput.checked = true;
        extendsInput.checked = false;
      }

      if (img.linkedText.text === "<<extends>>") {
        includeInput.checked = false;
        extendsInput.checked = true;
      }
    }

    nonSelectedImageDiv.style.display = 'none';
    selectedImageDiv.style.display = 'block';
  });
}

function sendCurrentCanvasStateToAllConnectedClients() {
  if (canvasHistory.length > 1) {
    const latestObjects = canvasHistory[canvasHistory.length - 1].objects;
    const jsonString = JSON.stringify(latestObjects);

    try {
      // Split the JSON string into manageable chunks
      const chunkSize = 1024; // 1KB chunks
      const totalChunks = Math.ceil(jsonString.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const chunk = jsonString.slice(i * chunkSize, (i + 1) * chunkSize);

        // Send each chunk with metadata if needed
        socket.send(JSON.stringify({
          type: "chunk",
          chunkNumber: i + 1,
          totalChunks,
          data: chunk,
        }));
      }

      console.log(`Canvas state sent in ${totalChunks} chunks.`);
    } catch (error) {
      console.error("Error sending canvas state to clients:", error);
    }
  }
}

function updateLinkedTextPositionForCanvasElement(canvasElement) {
  if (!canvasElement.linkedText) return;

  const { linkedText } = canvasElement;
  const scaledWidth = canvasElement.width * canvasElement.scaleX;
  const scaledHeight = canvasElement.height * canvasElement.scaleY;

  // Update linked text position based on categories
  if (centeredImages.includes(canvasElement.imageUrl)) {
    linkedText.left = canvasElement.left + scaledWidth / 2 - linkedText.width / 2;
    linkedText.top = canvasElement.top + scaledHeight / 2 - linkedText.height / 2;
  } else if (belowImages.includes(canvasElement.imageUrl)) {
    linkedText.left = canvasElement.left + scaledWidth / 2 - linkedText.width / 2;
    linkedText.top = canvasElement.top + scaledHeight;
  } else if (aboveImages.includes(canvasElement.imageUrl)) {
    linkedText.left = canvasElement.left + scaledWidth / 2 - linkedText.width / 2;
    linkedText.top = canvasElement.top - linkedText.height;
  }

  // Update linked text coordinates
  linkedText.setCoords();
}

function zoomCanvas(factor) {
  canvasZoomLevel = Math.max(0.2, Math.min(3, canvasZoomLevel * factor)); // Limit zoom between 0.2x and 3x
  diagramsMakerCanvas.setZoom(canvasZoomLevel);
  diagramsMakerCanvas.renderAll();
}

//Functions for use for both scripts.js and diagrammings_server_connection.js
export function clearCanvas() {
  diagramsMakerCanvas.clear();
  Object.values(connectedRemoteCursors).forEach(obj => diagramsMakerCanvas.add(obj));
  diagramsMakerCanvas.renderAll();
}

//This functions is only to be executed by diagrammings_server_connection.js
export function lockCanvasObjects(canvasObjectsToLock) {
  selectedImageDiv.style.display = 'none';
  nonSelectedImageDiv.style.display = 'block';

  canvasObjectsToLock.forEach((lockObject) => {
    const canvasObjectToLock = diagramsMakerCanvas.getObjects().find(obj => obj.id === lockObject.id);
    if (canvasObjectToLock) {
      canvasObjectToLock.set({
        editable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        selectable: false,
      });
    }
  });

  diagramsMakerCanvas.renderAll();

}

export function unlockCanvasObjects(canvasObjectsToUnlock) {
  canvasObjectsToUnlock.forEach((unlockObject) => {
    const canvasObjectToLock = diagramsMakerCanvas.getObjects().find(obj => obj.id === unlockObject.id);
    if (canvasObjectToLock) {
      canvasObjectToLock.set({
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        selectable: true,
      });
    }
  });

  diagramsMakerCanvas.renderAll();
}

export function renderRemoteCursors(remoteCursor) {
  const { x, y, userId } = remoteCursor;

  if (!connectedRemoteCursors[userId]) {
    const cursor = new fabric.Group([
      new fabric.Circle({
        left: x,
        top: y,
        radius: 5,
        fill: 'blue',
        selectable: false,
      }),
      new fabric.Text(userId, {
        left: x + 10, // Position the text near the circle
        top: y - 10,
        fontSize: 12,
        fill: 'black',
        selectable: false,
      }),
    ]);
    connectedRemoteCursors[userId] = cursor;
    diagramsMakerCanvas.add(cursor);
  } else {
    connectedRemoteCursors[userId].set({ left: x, top: y });
  }

  diagramsMakerCanvas.renderAll();
}