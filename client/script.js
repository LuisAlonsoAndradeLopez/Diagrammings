document.addEventListener('DOMContentLoaded', () => {
  const helpButton = document.getElementById('help-button');
  const exportButton = document.getElementById('export-button');

  const canvasContainer = document.getElementById('diagramming-content');
  const diagramsMakerCanvasHtmlElement = document.getElementById('diagrams-maker-canvas');
  const diagramsMakerCanvas = new fabric.Canvas(diagramsMakerCanvasHtmlElement);
  const diagramElements = document.querySelectorAll('.diagram-element');

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

      const textBox = new fabric.Textbox('Texto', {
        fontSize: 16,
        fontFamily: 'Arial',
        fontStyle: 'normal',
        fontWeight: 'bold',
        textAlign: 'center',
        editable: false,
        borderColor: 'gray',
        cornerColor: 'blue',
        padding: 5
      });

      textBox.set({
        left: img.left + img.getScaledWidth() / 2 - textBox.width / 2, // Adjust for TextBox width
        top: img.top + img.getScaledHeight() / 2 - textBox.height / 2 // Adjust for TextBox height
      });

      diagramsMakerCanvas.add(textBox);
      diagramsMakerCanvas.setActiveObject(textBox);
      diagramsMakerCanvas.renderAll();

      img.linkedText = textBox;

      img.on('moving', () => {
        if (img.linkedText) {
          img.linkedText.left = img.left + img.getScaledWidth() / 2 - textBox.width / 2;
          img.linkedText.top = img.top + img.getScaledHeight() / 2 - textBox.height / 2;
          diagramsMakerCanvas.renderAll();
        }
      });
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
    if (event.e.altKey || event.e.ctrlKey) { // Hold Alt or Ctrl to pan
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

  diagramsMakerCanvas.on('object:moving', (event) => {
    const obj = event.target;
    if (obj && obj.linkedText) {
      obj.linkedText.left = obj.left + 29.5;
      obj.linkedText.top = obj.top + 29;
      diagramsMakerCanvas.renderAll();
    }
  });

  document.addEventListener('keydown', (event) => {
    selectedCanvasObjects = diagramsMakerCanvas.getActiveObjects();

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
        diagramsMakerCanvas.remove(obj); // Remove each selected object
      });
      diagramsMakerCanvas.discardActiveObject(); // Clear selection
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
      *Exportación tiene que capturar todos los elementos incluso los que no se ven en el canvasContainer.
      *Control Z y Control Y
      *Cuando ajustas el tamaño de el elemento del diagrama, el texto también debe cambiar.
      *Escribir en el botón de ayuda los atajos de teclado.
      *En el div en blanco, ahí se debe de poder editar el texto.
      *Algunos elementos el texto se debe poner en otra posición, no centrado, como el actor, el sistema, etc.
      *Bloquear el modificar tamaño del texto, solo se puede hacer modificando el tamaño del elemento de diagrama asociado
      *Texto de elemento de diagrama, siempre en frente del elemento de diagrama, nunca lo debe tapar.
      *Hacer funcionar bien el copiar y pegar.
      *En el giro, arreglar el posicionamiento también.
      *Quitar el texto a algunos elementos.
    `);
  });

  exportButton.addEventListener('click', () => {
    if (diagramsMakerCanvas.getObjects()) {
      const canvasWidth = diagramsMakerCanvas.getWidth();
      const canvasHeight = diagramsMakerCanvas.getHeight();

      diagramsMakerCanvas.setWidth(diagramsMakerCanvas.getObjects().reduce((max, obj) => Math.max(max, obj.left + obj.width), 0));
      diagramsMakerCanvas.setHeight(diagramsMakerCanvas.getObjects().reduce((max, obj) => Math.max(max, obj.top + obj.height), 0));

      const dataURL = diagramsMakerCanvas.toDataURL({
        format: 'png',
        quality: 1.0
      });

      diagramsMakerCanvas.setWidth(canvasWidth);
      diagramsMakerCanvas.setHeight(canvasHeight);

      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'canvas.png';
      link.click();
    } else {
      alert('No se puede exportar un diagrama vacío.');
    }
  });

  function zoomCanvas(factor) {
    canvasZoomLevel = Math.max(0.2, Math.min(3, canvasZoomLevel * factor)); // Limit zoom between 0.2x and 3x
    diagramsMakerCanvas.setZoom(canvasZoomLevel);
    diagramsMakerCanvas.renderAll();
  }
});