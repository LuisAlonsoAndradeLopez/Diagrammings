document.addEventListener('DOMContentLoaded', () => {
  const helpButton = document.getElementById('help-button');
  const exportButton = document.getElementById('export-button');
  const canvasContainer = document.getElementById('diagramming-content');
  const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
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

  const diagramElements = document.querySelectorAll('.diagram-element');

  const diagramsMakerCanvas = new fabric.Canvas(diagramsMakerCanvasHtmlElement);

  let canvasHistory = [];
  let canvasHistoryRedo = [];

  let canvasZoomLevel = 1;
  let canvasIsPanning = false;
  let canvasLastPanPosition = { x: 0, y: 0 };

  let selectedCanvasObjectsForEdit = [];
  let selectedCanvasObjectsForDelete = [];
  let copiedOrCutCanvasObjects = [];

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
      img.set({
        imageUrl: imageUrl.split('/').pop()
      });

      let textBox;

      setCanvasDiagramElementAttributes(img);

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
        setCombinedCanvasDiagramElementAndTextBoxAttributes(img);
        diagramsMakerCanvas.add(img);

        if (img.linkedText) {
          diagramsMakerCanvas.add(textBox);
          img.linkedText.bringForward();
        }

        diagramsMakerCanvas.setActiveObject(img);
        diagramsMakerCanvas.renderAll();
      }
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
  });

  diagramsMakerCanvas.on('mouse:up', () => {
    canvasIsPanning = false;
    diagramsMakerCanvas.selection = true; // Re-enable object selection
  });

  diagramsMakerCanvas.on('object:added', (event) => {
    const addedObject = event.target;
    updateLinkedTextPositionForCanvasElement(addedObject);
    saveCanvasState();

    if (addedObject.type === 'textbox') {
      canvasHistory.splice(canvasHistory.length - 2, 1);
    }
  });

  //For understand this function behavior and if you want to modify, you should understand the document.addEventListener(keydown) if (event.key === 'Backspace' && selectedCanvasObjectsForDelete.length > 0) {} behavior.
  diagramsMakerCanvas.on('object:removed', (event) => {
    const removedObject = event.target;
    diagramsMakerCanvas.renderAll();
    saveCanvasState();

    if (removedObject.type === 'textbox') {
      canvasHistory.splice(canvasHistory.length - 2, 1);
    }
  });

  diagramsMakerCanvas.on('object:moving', (event) => {
    handleCanvasObjectEvent(event, true);
  });

  diagramsMakerCanvas.on('object:modified', (event) => {
    handleCanvasObjectEvent(event);
    saveCanvasState();
  });

  diagramsMakerCanvas.on('selection:cleared', () => {
    diagramsMakerCanvas.getObjects('image').forEach((img) => {
      if (img.linkedText) {
        img.linkedText.evented = false;
      }
    });

    diagramsMakerCanvas.renderAll();

    selectedCanvasObjectsForDelete = [];
  });

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      if (canvasHistory.length > 0) {
        const currentState = canvasHistory.pop();
        canvasHistoryRedo.push(currentState);

        diagramsMakerCanvas.loadFromJSON(canvasHistory[canvasHistory.length - 1], () => {
          diagramsMakerCanvas.renderAll();
        });
      }
    }

    if (event.ctrlKey && event.key === 'y') {
      event.preventDefault();
      if (canvasHistoryRedo.length > 0) {
        const nextState = canvasHistoryRedo.pop();
        canvasHistory.push(diagramsMakerCanvas.toJSON());

        diagramsMakerCanvas.loadFromJSON(nextState, () => {
          diagramsMakerCanvas.renderAll();
        });
      }
    }

    if (event.ctrlKey && event.key === 'c' && diagramsMakerCanvas.getActiveObjects().length > 0) {
      copiedOrCutCanvasObjects = [];

      diagramsMakerCanvas.getActiveObjects().forEach((img) => {
        img.clone((clonedImg) => {
          setCanvasDiagramElementAttributes(clonedImg);

          if (img.linkedText) {
            img.linkedText.clone((clonedTextBox) => {
              setCanvasDiagramElementTextBoxAttributes(clonedTextBox);
              clonedImg.linkedText = clonedTextBox;
              setCombinedCanvasDiagramElementAndTextBoxAttributes(clonedImg, clonedTextBox);

              copiedOrCutCanvasObjects.push({ object: clonedImg, objectImageUrl: img.imageUrl, text: clonedTextBox });
            });
          } else {
            copiedOrCutCanvasObjects.push({ object: clonedImg, objectImageUrl: img.imageUrl });
          }
        });
      });
    }

    if (event.ctrlKey && event.key === 'x' && diagramsMakerCanvas.getActiveObjects().length > 0) {
      copiedOrCutCanvasObjects = [];

      diagramsMakerCanvas.getActiveObjects().forEach((img) => {
        img.clone((clonedImg) => {
          setCanvasDiagramElementAttributes(clonedImg);

          if (img.linkedText) {
            img.linkedText.clone((clonedTextBox) => {
              setCanvasDiagramElementTextBoxAttributes(clonedTextBox);
              clonedImg.linkedText = clonedTextBox;
              setCombinedCanvasDiagramElementAndTextBoxAttributes(clonedImg, clonedTextBox);

              copiedOrCutCanvasObjects.push({ object: clonedImg, objectImageUrl: img.imageUrl, text: clonedTextBox });
              diagramsMakerCanvas.remove(img.linkedText);
            });
          } else {
            copiedOrCutCanvasObjects.push({ object: clonedImg, objectImageUrl: img.imageUrl });
          }

          diagramsMakerCanvas.remove(img);
          diagramsMakerCanvas.discardActiveObject();
        });
      });

      nonSelectedImageDiv.style.display = 'block';
      selectedImageDiv.style.display = 'none';
    }

    if (event.ctrlKey && event.key === 'v' && copiedOrCutCanvasObjects.length > 0) {
      copiedOrCutCanvasObjects.forEach((copiedObj) => {
        const clonedObj = copiedObj.object;
        const clonedObjImageUrl = copiedObj.objectImageUrl;

        clonedObj.clone((pastedImg) => {
          pastedImg.set({
            imageUrl: clonedObjImageUrl
          });

          setCanvasDiagramElementAttributes(pastedImg);

          if (copiedObj.text) {
            copiedObj.text.clone((pastedTextBox) => {
              setCanvasDiagramElementTextBoxAttributes(pastedTextBox);
              pastedImg.linkedText = pastedTextBox;
              setCombinedCanvasDiagramElementAndTextBoxAttributes(pastedImg, pastedTextBox);
              diagramsMakerCanvas.add(pastedTextBox);
            });
          }

          diagramsMakerCanvas.add(pastedImg);

          if (pastedImg.linkedText) {
            pastedImg.linkedText.bringForward();
          }

          diagramsMakerCanvas.setActiveObject(pastedImg);
          diagramsMakerCanvas.renderAll();
        });
      });
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
      TODO: 
      Funcionalidades a implementar:
      *Control Z: Agregarle el saveCanvasState a los elementos gráficos y coregir el bug de atributos por el loadToJson.
      *Control Y: Agregarle el saveCanvasState a los elementos gráficos y coregir el bug de atributos por el loadToJson.
      *Cuando se pegan más de un elemento cortado o pegado, corregir sus posiciones y todos deben de estar seleccionados. (Funcionalidad para la Versión 1.1)
      *Cuando se mueven más de un elemento, el texto siempre debe moverse como debe.

      *Escribir en el botón de ayuda los atajos de teclado. (Quitar los WIP cuando termines todo).

      Bugs
      *Copiar y pegar elemento no genera elemento con el mismo tamaño.

      *Ctrl + Z: Revertir cambios (WIP).
      *Ctrl + Y: Recuperar elementos de la reversión de cambios (WIP).
      *Ctrl + C: Copiar elementos seleccionados (WIP).
      *Ctrl + X: Cortar elementos seleccionados (WIP).
      *Ctrl + V: Pegar elementos copiados (WIP).
      *Backspace: Eliminar elementos seleccionados.
      *+: Agrandar el zoom del canvas.
      *-: Minimizar el zoom del canvas.
      *Ctrl + Click y mover el cursor: Mover el canvas.
    `);
  });

  exportButton.addEventListener('click', () => {
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
    extendsInput.checked = false;
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text = "<<include>>";
    diagramsMakerCanvas.renderAll();
  });

  extendsInput.addEventListener('click', () => {
    includeInput.checked = false;
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text = "<<extends>>";
    diagramsMakerCanvas.renderAll();
  });

  selectedElementTextInput.addEventListener('input', () => {
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text = selectedElementTextInput.value;
    updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
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
  });

  setElementsInFrontButton.addEventListener('click', () => {
    diagramsMakerCanvas.bringToFront(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.bringToFront(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText);
    diagramsMakerCanvas.renderAll();
  });

  setElementsAtTheBottomButton.addEventListener('click', () => {
    diagramsMakerCanvas.sendToBack(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText);
    diagramsMakerCanvas.sendToBack(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
  });

  textAlignLeftButton.addEventListener('click', () => {
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign = 'left';
    updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
  });

  textAlignCenterButton.addEventListener('click', () => {
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign = 'center';
    updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
  });

  textAlignRightButton.addEventListener('click', () => {
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign = 'right';
    updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
  });

  textAlignJustifyButton.addEventListener('click', () => {
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.textAlign = 'justify';
    updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
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

    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.fontSize = textFontSizeInput.value;
    updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
  });

  function handleCanvasObjectEvent(event, shouldRender = false) {
    const selectedElements = event.target;

    if (selectedElements.type === 'activeSelection') {
      selectedElements._objects.forEach((obj) => {
        if (obj.linkedText && !includeAndExtendsTextImages.includes(obj.imageUrl)) {
          updateLinkedTextPositionForCanvasElement(obj);
        }
      });
    } else if (selectedElements.linkedText && !includeAndExtendsTextImages.includes(selectedElements.imageUrl)) {
      updateLinkedTextPositionForCanvasElement(selectedElements);
    }

    if (shouldRender) {
      diagramsMakerCanvas.renderAll();
    }
  }

  function setCanvasDiagramElementAttributes(img) {
    img.scaleToWidth(100);
    img.scaleToHeight(75);

    img.set({
      left: mousePointer.x - img.getScaledWidth() / 2,
      top: mousePointer.y - img.getScaledHeight() / 2,
      selectable: true,
      fill: 'black'
    });

    if (notRotatingImages.includes(img.imageUrl)) {
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
    })

    img.on('rotating', () => {
      if (img.linkedText && !includeAndExtendsTextImages.includes(img.imageUrl)) {
        updateLinkedTextPositionForCanvasElement(img);
      }
    });

    img.on('selected', () => {
      if (selectedCanvasObjectsForEdit.includes(img)) {
        const index = selectedCanvasObjectsForEdit.indexOf(img);
        if (index !== -1) {
          selectedCanvasObjectsForEdit.splice(index, 1);
        }
      }

      if (img.linkedText && !includeAndExtendsTextImages.includes(img.imageUrl)) {
        selectedElementTextInput.value = img.linkedText.text;
        textFontSizeInput.value = img.linkedText.fontSize;
        updateLinkedTextPositionForCanvasElement(img);
      }

      selectedCanvasObjectsForEdit.push(img);
      selectedCanvasObjectsForDelete.push(img);

      if (diagramsMakerCanvas.getActiveObjects().length > 1) {
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

  function saveCanvasState() {
    canvasHistory.push(diagramsMakerCanvas.toJSON());
  }

  function updateLinkedTextPositionForCanvasElement(canvasElement) {
    if (centeredImages.includes(canvasElement.imageUrl)) {
      canvasElement.linkedText.left = canvasElement.left + canvasElement.getScaledWidth() / 2 - canvasElement.linkedText.width / 2;
      canvasElement.linkedText.top = canvasElement.top + canvasElement.getScaledHeight() / 2 - canvasElement.linkedText.height / 2;
    } else if (belowImages.includes(canvasElement.imageUrl)) {
      canvasElement.linkedText.left = canvasElement.left + canvasElement.getScaledWidth() / 2 - canvasElement.linkedText.width / 2;
      canvasElement.linkedText.top = canvasElement.top + canvasElement.getScaledHeight() + 10;
    } else if (aboveImages.includes(canvasElement.imageUrl)) {
      canvasElement.linkedText.left = canvasElement.left + canvasElement.getScaledWidth() / 2 - canvasElement.linkedText.width / 2;
      canvasElement.linkedText.top = canvasElement.top - canvasElement.linkedText.height + 10;
    }
  }

  function zoomCanvas(factor) {
    canvasZoomLevel = Math.max(0.2, Math.min(3, canvasZoomLevel * factor)); // Limit zoom between 0.2x and 3x
    diagramsMakerCanvas.setZoom(canvasZoomLevel);
    diagramsMakerCanvas.renderAll();
  }

  saveCanvasState();
});