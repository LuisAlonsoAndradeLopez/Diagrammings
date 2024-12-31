document.addEventListener('DOMContentLoaded', () => {
  const helpButton = document.getElementById('help-button');
  const exportButton = document.getElementById('export-button');
  const canvasContainer = document.getElementById('diagramming-content');
  const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
  const selectedImageDiv = document.getElementById('selected-image-div');
  const nonSelectedImageDiv = document.getElementById('non-selected-image-div');

  const diagramElements = document.querySelectorAll('.diagram-element');

  const diagramsMakerCanvas = new fabric.Canvas(diagramsMakerCanvasHtmlElement);

  let canvasHistory = [];
  let canvasZoomLevel = 1;
  let canvasIsPanning = false;
  let canvasLastPanPosition = { x: 0, y: 0 };

  let selectedCanvasObjects = [];
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

    const pointer = diagramsMakerCanvas.getPointer(event);

    fabric.Image.fromURL(imageUrl, (img) => {
      img.set({
        imageUrl: imageUrl.split('/').pop()
      });

      setCanvasDiagramElementAttributes(img, pointer);

      if (!notScalingYAndFlipImages.includes(img.imageUrl)) {
        const textBox = new fabric.Textbox('Texto');
        setCanvasDiagramElementTextBoxAttributes(textBox);
        img.linkedText = textBox;
        setCombinedCanvasDiagramElementAndTextBoxAttributes(img, textBox);
        diagramsMakerCanvas.add(textBox);
        img.linkedText.bringToFront();
      }

      diagramsMakerCanvas.add(img);
      diagramsMakerCanvas.setActiveObject(img);
      diagramsMakerCanvas.renderAll();
    });
  });

  diagramsMakerCanvasHtmlElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const pointer = diagramsMakerCanvas.getPointer(event);

    diagramsMakerCanvas.zoomToPoint(new fabric.Point(pointer.x, pointer.y), canvasZoomLevel * delta);
    canvasZoomLevel = diagramsMakerCanvas.getZoom();
  });

  diagramsMakerCanvas.on('mouse:down', (event) => {
    if (event.e.ctrlKey) {
      canvasIsPanning = true;
      canvasLastPanPosition.x = event.e.clientX;
      canvasLastPanPosition.y = event.e.clientY;
      diagramsMakerCanvas.selection = false; // Disable object selection while panning
    }
  });

  diagramsMakerCanvas.on('mouse:move', (event) => {
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

  diagramsMakerCanvas.on('object:modified', saveCanvasState);
  diagramsMakerCanvas.on('object:added', saveCanvasState);
  diagramsMakerCanvas.on('object:removed', saveCanvasState);

  diagramsMakerCanvas.on('object:moving', (event) => {
    const movingObject = event.target;
    if (movingObject && movingObject.linkedText) {
      if (centeredImages.includes(movingObject.imageUrl)) {
        movingObject.linkedText.left = movingObject.left + movingObject.getScaledWidth() / 2 - movingObject.linkedText.width / 2;
        movingObject.linkedText.top = movingObject.top + movingObject.getScaledHeight() / 2 - movingObject.linkedText.height / 2;
      } else if (belowImages.includes(movingObject.imageUrl)) {
        movingObject.linkedText.left = movingObject.left + movingObject.getScaledWidth() / 2 - movingObject.linkedText.width / 2;
        movingObject.linkedText.top = movingObject.top + movingObject.getScaledHeight() + 10;
      } else if (aboveImages.includes(movingObject.imageUrl)) {
        movingObject.linkedText.left = movingObject.left + movingObject.getScaledWidth() / 2 - movingObject.linkedText.width / 2;
        movingObject.linkedText.top = movingObject.top - movingObject.linkedText.height + 10;
      }
      movingObject.linkedText.bringToFront();
    }
    diagramsMakerCanvas.renderAll();
  });

  diagramsMakerCanvas.on('selection:cleared', () => {
    diagramsMakerCanvas.getObjects('image').forEach((img) => {
      if (img.linkedText) {
        img.linkedText.evented = false;
      }
    });

    nonSelectedImageDiv.style.display = 'block';
    selectedImageDiv.style.display = 'none';

    diagramsMakerCanvas.renderAll();
  });

  document.addEventListener('keydown', (event) => {
    selectedCanvasObjects = diagramsMakerCanvas.getActiveObjects();
    const pointer = diagramsMakerCanvas.getPointer(event);

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

    if (event.ctrlKey && event.key === 'c' && selectedCanvasObjects.length > 0) {
      copiedOrCutCanvasObjects = [];

      selectedCanvasObjects.forEach((img) => {
        img.clone((clonedImg) => {
          setCanvasDiagramElementAttributes(clonedImg, pointer);

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

    if (event.ctrlKey && event.key === 'x' && selectedCanvasObjects.length > 0) {
      copiedOrCutCanvasObjects = [];

      selectedCanvasObjects.forEach((img) => {
        img.clone((clonedImg) => {
          setCanvasDiagramElementAttributes(clonedImg, pointer);

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
          selectedCanvasObjects = [];
        });
      });
    }

    if (event.ctrlKey && event.key === 'v' && copiedOrCutCanvasObjects.length > 0) {
      copiedOrCutCanvasObjects.forEach((copiedObj) => {
        const clonedObj = copiedObj.object;
        const clonedObjImageUrl = copiedObj.objectImageUrl;
        console.log("clonedObjImageUrl: " + clonedObjImageUrl);

        clonedObj.clone((pastedImg) => {
          pastedImg.set({
            imageUrl: clonedObjImageUrl
          });
          console.log("pastedImg.imageUrl: " + pastedImg.imageUrl);

          setCanvasDiagramElementAttributes(pastedImg, pointer);

          if (copiedObj.text) {
            copiedObj.text.clone((pastedTextBox) => {
              setCanvasDiagramElementTextBoxAttributes(pastedTextBox);
              pastedImg.linkedText = pastedTextBox;
              setCombinedCanvasDiagramElementAndTextBoxAttributes(pastedImg, pastedTextBox);
              diagramsMakerCanvas.add(pastedTextBox);

            });
          }

          diagramsMakerCanvas.add(pastedImg);
          diagramsMakerCanvas.setActiveObject(pastedImg);
          diagramsMakerCanvas.renderAll();
        });

        console.log("Pasted objects:", copiedOrCutCanvasObjects);
      });
    }

    if (event.key === 'Backspace' && selectedCanvasObjects) {
      selectedCanvasObjects.forEach((obj) => {
        if (obj.type === 'image') {
          if (obj.linkedText) {
            diagramsMakerCanvas.remove(obj.linkedText);
          }
        }

        diagramsMakerCanvas.remove(obj);
        diagramsMakerCanvas.renderAll();
      });

      diagramsMakerCanvas.discardActiveObject();
      diagramsMakerCanvas.renderAll();
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
      Los dificiles
      *Exportación tiene que capturar todos los elementos incluso los que no se ven en el canvasContainer. (Pulir)
      *Control Z y Control Y
      *Control X
      *Control C y Control V.
      *Cuando se mueven más de un elemento, el texto siempre debe moverse como debe.
      *En el div en blanco, ahí se debe de poder editar el texto.
      *Pasar elemento hacia en frente o hacia atrás.
      *Agregar el include o extend a la flecha de include/extend

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

  function setCanvasDiagramElementAttributes(img, pointer) {
    img.scaleToWidth(100);
    img.scaleToHeight(75);

    img.set({
      left: pointer.x - img.getScaledWidth() / 2,
      top: pointer.y - img.getScaledHeight() / 2,
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

    img.on('selected', () => {
      nonSelectedImageDiv.style.display = 'none';
      selectedImageDiv.style.display = 'block';
    });
  }

  function setCanvasDiagramElementTextBoxAttributes(textBox) {
    textBox.set({
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
    if (centeredImages.includes(img.imageUrl)) {
      textBox.set({
        left: img.left + img.getScaledWidth() / 2 - textBox.width / 2,
        top: img.top + img.getScaledHeight() / 2 - textBox.height / 2
      });
    } else if (belowImages.includes(img.imageUrl)) {
      textBox.set({
        left: img.left + img.getScaledWidth() / 2 - textBox.width / 2,
        top: img.top + img.getScaledHeight() + 10
      });
    } else if (aboveImages.includes(img.imageUrl)) {
      textBox.set({
        left: img.left + img.getScaledWidth() / 2 - textBox.width / 2,
        top: img.top - textBox.height + 10
      });
    }

    ['scaling', 'rotating'].forEach((event) => {
      img.on(event, () => {
        if (img.linkedText) {
          if (centeredImages.includes(img.imageUrl)) {
            img.linkedText.left = img.left + img.getScaledWidth() / 2 - textBox.width / 2;
            img.linkedText.top = img.top + img.getScaledHeight() / 2 - textBox.height / 2;
          } else if (belowImages.includes(img.imageUrl)) {
            img.linkedText.left = img.left + img.getScaledWidth() / 2 - textBox.width / 2;
            img.linkedText.top = img.top + img.getScaledHeight() + 10;
          } else if (aboveImages.includes(img.imageUrl)) {
            img.linkedText.left = img.left + img.getScaledWidth() / 2 - textBox.width / 2;
            img.linkedText.top = img.top - textBox.height + 10;
          }
        }
      });
    });
  }

  function saveCanvasState() {
    console.log(canvasHistory);
    console.log(canvasHistory.length);

    canvasHistory.push(diagramsMakerCanvas.toJSON());
  }

  function zoomCanvas(factor) {
    canvasZoomLevel = Math.max(0.2, Math.min(3, canvasZoomLevel * factor)); // Limit zoom between 0.2x and 3x
    diagramsMakerCanvas.setZoom(canvasZoomLevel);
    diagramsMakerCanvas.renderAll();
  }

  saveCanvasState();
});