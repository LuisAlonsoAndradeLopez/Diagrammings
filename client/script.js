document.addEventListener('DOMContentLoaded', () => {
  const helpButton = document.getElementById('help-button');
  const exportButton = document.getElementById('export-button');

  const canvasContainer = document.getElementById('diagramming-content');
  const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
  const diagramsMakerCanvas = new fabric.Canvas(diagramsMakerCanvasHtmlElement);
  const diagramElements = document.querySelectorAll('.diagram-element');

  let canvasHistory = [];
  let canvasZoomLevel = 1;
  let canvasIsPanning = false;
  let canvasLastPanPosition = { x: 0, y: 0 };

  let selectedCanvasObjects = null;
  let copiedCanvasObjects = [];

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
      img.scaleToWidth(100);
      img.scaleToHeight(75);

      img.set({
        left: pointer.x,
        top: pointer.y,
        selectable: true,
      });

      diagramsMakerCanvas.add(img);
      diagramsMakerCanvas.renderAll();

      if (imageUrl.split('/').pop() !== 'asociation.png' && imageUrl.split('/').pop() !== 'dependency.png' &&
        imageUrl.split('/').pop() !== 'generalization.png' && imageUrl.split('/').pop() !== 'flow.png') {
        const textBox = new fabric.Textbox('Texto', {
          fontSize: 16,
          fontFamily: 'Arial',
          fontStyle: 'normal',
          fontWeight: 'bold',
          textAlign: 'center',
          borderColor: 'gray',
          cornerColor: 'blue',
          editable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          selectable: false,
          padding: 5
        });

        if (imageUrl.split('/').pop() === 'decision.png' || imageUrl.split('/').pop() === 'document.png' ||
          imageUrl.split('/').pop() === 'input_output.png' || imageUrl.split('/').pop() === 'off_page_reference.png' ||
          imageUrl.split('/').pop() === 'on_page_reference.png' || imageUrl.split('/').pop() === 'process.png' ||
          imageUrl.split('/').pop() === 'start_end.png' || imageUrl.split('/').pop() === 'use_case.png') {
          textBox.set({
            left: img.left + img.getScaledWidth() / 2 - textBox.width / 2, 
            top: img.top + img.getScaledHeight() / 2 - textBox.height / 2 
          });
        } else if (imageUrl.split('/').pop() === 'actor.png') {
          textBox.set({
            left: img.left + img.getScaledWidth() / 2 - textBox.width / 2, 
            top: img.top + img.getScaledHeight() + 10 
          });
        } else if (imageUrl.split('/').pop() === 'system.png') {
          textBox.set({
            left: img.left + img.getScaledWidth() / 2 - textBox.width / 2, 
            top: img.top + img.getScaledHeight() - 10 
          });
        }

        diagramsMakerCanvas.add(textBox);
        diagramsMakerCanvas.renderAll();

        img.linkedText = textBox;

        img.on('moving', () => {
          if (img.linkedText) {
            if (imageUrl.split('/').pop() === 'decision.png' || imageUrl.split('/').pop() === 'document.png' ||
              imageUrl.split('/').pop() === 'input_output.png' || imageUrl.split('/').pop() === 'off_page_reference.png' ||
              imageUrl.split('/').pop() === 'on_page_reference.png' || imageUrl.split('/').pop() === 'process.png' ||
              imageUrl.split('/').pop() === 'start_end.png' || imageUrl.split('/').pop() === 'use_case.png') {
              img.linkedText.left = img.left + img.getScaledWidth() / 2 - textBox.width / 2;
              img.linkedText.top = img.top + img.getScaledHeight() / 2 - textBox.height / 2;
            } else if (imageUrl.split('/').pop() === 'actor.png') {
              img.linkedText.left = img.left + img.getScaledWidth() / 2 - textBox.width / 2;
              img.linkedText.top = img.top + img.getScaledHeight() + 10;
            } else if (imageUrl.split('/').pop() === 'system.png') {
              img.linkedText.left = img.left + img.getScaledWidth() / 2 - textBox.width / 2;
              img.linkedText.top = img.top + img.getScaledHeight() - 90;
            }

            img.linkedText.bringToFront(); // Bring text above the image
            diagramsMakerCanvas.renderAll();
          }
        });

        img.on('selected', () => {
          if (img.linkedText) {
            img.linkedText.bringToFront(); // Bring text above the image
            diagramsMakerCanvas.renderAll();
          }
        });

        diagramsMakerCanvas.on('selection:cleared', () => {
          diagramsMakerCanvas.getObjects('image').forEach((img) => {
            if (img.linkedText) {
              img.linkedText.evented = false; // Maintain non-interactability
            }
          });
          diagramsMakerCanvas.renderAll();
        });
      }
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


  document.addEventListener('keydown', (event) => {
    selectedCanvasObjects = diagramsMakerCanvas.getActiveObjects();

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

    if (event.ctrlKey && event.key === 'c' && selectedCanvasObjects) {
      copiedCanvasObjects = [];

      selectedCanvasObjects.forEach((obj) => {
        obj.clone((clonedObj) => {
          copiedCanvasObjects.push(clonedObj);
        });
      });
    }

    if (event.ctrlKey && event.key === 'v' && copiedCanvasObjects) {
      copiedCanvasObjects.forEach((copiedObj) => {
        copiedObj.clone((clonedObj) => {
          clonedObj.set({
            left: copiedObj.left,
            top: copiedObj.top,
          });

          diagramsMakerCanvas.add(clonedObj);
          diagramsMakerCanvas.setActiveObject(clonedObj);
          diagramsMakerCanvas.renderAll();

          copiedCanvasObjects.push(clonedObj);
        });
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
      *Hacer funcionar bien el copiar y pegar.
      *En el div en blanco, ahí se debe de poder editar el texto.
      *Cuando se mueven más de un elemento, el texto siempre debe moverse como debe.

      *Cuando ajustas el tamaño de el elemento del diagrama, el texto también debe cambiar de tamaño y ajustarse en la posición que debe.
      *Escribir en el botón de ayuda los atajos de teclado. (Quitar los WIP cuando termines todo).
      *Algunos elementos el texto se debe poner en otra posición, no centrado, como el actor, el sistema, etc.
      *Texto de elemento de diagrama, siempre en frente del elemento de diagrama, nunca lo debe tapar.
      *En el giro, arreglar el posicionamiento (solo en las flechas que requieran de texto).
      *Desactivar el giro en los elementos que no sean las flechas.
      *Al poner el cursor en una imagen, mostrar el nombre del elemento seleccionado

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