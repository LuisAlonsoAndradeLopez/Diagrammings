document.addEventListener('DOMContentLoaded', () => {
  const helpButton = document.getElementById('help-button');
  const exportButton = document.getElementById('export-button');
  const canvasContainer = document.getElementById('diagramming-content');
  const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
  const diagramsElementsEditorDiv = document.getElementById('diagrams-elements-editor-div');
  const selectedImageDiv = document.getElementById('selected-image-div');
  const nonSelectedImageDiv = document.getElementById('non-selected-image-div');
  const selectedElementTextInput = document.getElementById('selected-element-text-input');
  const textFontSizeInput = document.getElementById('text-font-size-input');

  const diagramElements = document.querySelectorAll('.diagram-element');

  const diagramsMakerCanvas = new fabric.Canvas(diagramsMakerCanvasHtmlElement);

  let canvasHistory = [];
  let canvasZoomLevel = 1;
  let canvasIsPanning = false;
  let canvasLastPanPosition = { x: 0, y: 0 };

  let selectedCanvasObjectsForEdit = [];
  let selectedCanvasObjectsForDelete = [];
  let copiedOrCutCanvasObjects = [];

  const centeredImages = [
    'decision.png', 'document.png', 'input_output.png', 'off_page_reference.png', 'on_page_reference.png',
    'process.png', 'start_end.png', 'use_case.png'
  ];

  const belowImages = ['actor.png'];
  const aboveImages = ['system.png'];

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

      setCanvasDiagramElementAttributes(img);

      if (!notScalingYAndFlipImages.includes(img.imageUrl)) {
        const textBox = new fabric.Textbox('Texto');
        setCanvasDiagramElementTextBoxAttributes(textBox);
        img.linkedText = textBox;
        setCombinedCanvasDiagramElementAndTextBoxAttributes(img, textBox);
        diagramsMakerCanvas.add(textBox);
      }

      diagramsMakerCanvas.add(img);

      if (img.linkedText) {
        img.linkedText.bringToFront();
      }

      diagramsMakerCanvas.setActiveObject(img);
      diagramsMakerCanvas.renderAll();
    });
  });

  diagramsMakerCanvasHtmlElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;

    diagramsMakerCanvas.zoomToPoint(new fabric.Point(mousePointer.x, mousePointer.y), canvasZoomLevel * delta);
    canvasZoomLevel = diagramsMakerCanvas.getZoom();
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
    handleCanvasObjectEvent(event);
    saveCanvasState();
  });

  diagramsMakerCanvas.on('object:removed', saveCanvasState);

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
        console.log('El puta boja');
        diagramsMakerCanvas.loadFromJSON(canvasHistory[canvasHistory.length], () => {
          diagramsMakerCanvas.renderAll();
        });
      }
    }

    if (event.ctrlKey && event.key === 'y') {
      event.preventDefault();
      console.log('Piensa que va a vivir del basquetbol');
      diagramsMakerCanvas.loadFromJSON(canvasHistory[canvasHistory.length], () => {
        diagramsMakerCanvas.renderAll();
      });
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
            pastedImg.linkedText.bringToFront();
          }

          diagramsMakerCanvas.setActiveObject(pastedImg);
          diagramsMakerCanvas.renderAll();
        });
      });
    }

    if (event.key === 'Backspace' && selectedCanvasObjectsForDelete.length > 0) {
      selectedCanvasObjectsForDelete.forEach((obj) => {
        if (obj.type === 'image') {
          if (obj.linkedText) {
            diagramsMakerCanvas.remove(obj.linkedText);
          }
        }

        diagramsMakerCanvas.remove(obj);
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
      *Exportación tiene que capturar todos los elementos incluso los que no se ven en el canvasContainer. (Pulir)
      *Control Z 
      *Control Y 
      *Cuando se pegan más de un elemento cortado o pegado, corregir sus posiciones y todos deben de estar seleccionados.
      *Cuando se mueven más de un elemento, el texto siempre debe moverse como debe.
      *Cambiar el tamaño del texto.
      *Funcionalidad botones de ajuste de texto y ponerles sus imágenes.
      *Pasar elemento hacia en frente o hacia atrás.
      *Agregar el include o extend a la flecha de include/extend

      Bugs:
      *Al eliminar un elemento se eliminan todos.
      *No se pueden eliminar los elementos que no tienen texto.

      *Escribir en el botón de ayuda los atajos de teclado. (Quitar los WIP cuando termines todo).

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

      diagramsMakerCanvas.renderAll();

      const dataURL = diagramsMakerCanvas.toDataURL({
        format: 'png',
        quality: 1.0
      });

      diagramsMakerCanvas.setDimensions({ width: originalWidth, height: originalHeight });
      objects.forEach((obj) => {
        obj.left += bounds.minX;
        obj.top += bounds.minY;
        obj.setCoords();
      });

      diagramsMakerCanvas.renderAll();

      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'canvas.png';
      link.click();
    } else {
      alert('No se puede exportar un diagrama vacío.');
    }
  });

  selectedElementTextInput.addEventListener('input', (event) => {
    selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1].linkedText.text = selectedElementTextInput.value;
    updateLinkedTextPositionForCanvasElement(selectedCanvasObjectsForEdit[selectedCanvasObjectsForEdit.length - 1]);
    diagramsMakerCanvas.renderAll();
  });

  diagramsElementsEditorDiv.addEventListener('click', (event) => {
    diagramsMakerCanvas.discardActiveObject();
  });

  function handleCanvasObjectEvent(event, shouldRender = false) {
    const selectedElements = event.target;

    if (selectedElements.type === 'activeSelection') {
      selectedElements._objects.forEach((obj) => {
        if (obj.linkedText) {
          updateLinkedTextPositionForCanvasElement(obj);
        }
      });
    } else if (selectedElements.linkedText) {
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

  function setCombinedCanvasDiagramElementAndTextBoxAttributes(img, textBox) {
    updateLinkedTextPositionForCanvasElement(img);


    img.on('scaling', () => {
      if (img.linkedText) {
        img.linkedText.set({
          width: img.getScaledWidth() * 0.75,
          height: img.getScaledHeight()
        });
        
        updateLinkedTextPositionForCanvasElement(img);
      }
    })

    img.on('rotating', () => {
      if (img.linkedText) {
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

      if (img.linkedText) {
        selectedElementTextInput.value = img.linkedText.text;

        console.log("img.linkedText.getScaledWidth: " + img.linkedText.getScaledWidth());
        console.log("img.linkedText.getScaledHeight: " + img.linkedText.getScaledHeight());
        console.log("img.getScaledWidth: " + img.getScaledWidth());
        console.log("img.getScaledHeight: " + img.getScaledHeight());

        updateLinkedTextPositionForCanvasElement(img);
      }

      selectedCanvasObjectsForEdit.push(img);
      selectedCanvasObjectsForDelete.push(img);

      nonSelectedImageDiv.style.display = 'none';
      selectedImageDiv.style.display = 'block';
    });
  }

  function saveCanvasState() {
    console.log(canvasHistory);
    console.log(canvasHistory.length);

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

    canvasElement.linkedText.bringToFront();
  }

  function zoomCanvas(factor) {
    canvasZoomLevel = Math.max(0.2, Math.min(3, canvasZoomLevel * factor)); // Limit zoom between 0.2x and 3x
    diagramsMakerCanvas.setZoom(canvasZoomLevel);
    diagramsMakerCanvas.renderAll();
  }

  saveCanvasState();
});