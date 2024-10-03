document.getElementById('file-input').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function () {
            const typedArray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedArray).promise.then(async function (pdf) {
                let resultDiv = document.getElementById('result');
                resultDiv.innerHTML = '';

                let totalCost = 0; // Inicializamos el costo total

                // Recorrer todas las páginas del PDF
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);

                    // Renderizar la página en un canvas
                    const viewport = page.getViewport({ scale: 1 });
                    const canvas = document.getElementById('pdf-canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };

                    await page.render(renderContext).promise;

                    // Obtener los datos de los píxeles del canvas
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const pixels = imageData.data;
                    let totalPixels = pixels.length / 4; // Cada píxel tiene 4 valores (RGBA)

                    // Variables para contar colores
                    let whitePixels = 0;
                    let blackPixels = 0;
                    let colorPixels = 0;

                    // Función para calcular la luminancia (brillo)
                    function luminance(r, g, b) {
                        return 0.299 * r + 0.587 * g + 0.114 * b;
                    }

                    // Umbrales de color
                    const whiteThreshold = 240; // Todo lo que tenga luminancia superior a 240 será considerado blanco
                    const blackThreshold = 100;  // Consideramos todos los tonos oscuros (incluidos grises) con luminancia < 100 como negros

                    // Analizar los píxeles
                    for (let j = 0; j < pixels.length; j += 4) {
                        const r = pixels[j];
                        const g = pixels[j + 1];
                        const b = pixels[j + 2];

                        const lumin = luminance(r, g, b);

                        if (lumin > whiteThreshold) {
                            whitePixels++;
                        } else if (lumin < blackThreshold) {
                            blackPixels++;
                        } else {
                            colorPixels++;
                        }
                    }

                    // Calcular porcentajes
                    const whitePercentage = (whitePixels / totalPixels) * 100;
                    const blackPercentage = (blackPixels / totalPixels) * 100;
                    const colorPercentage = (colorPixels / totalPixels) * 100;

                    // Calcular el costo de la página según las reglas establecidas
                    let pageCost = 0;

                    if (colorPercentage < 8) {
                        pageCost = 0.10; // Menor al 8% de color (sea cual sea el porcentaje de negro)
                    } else if (whitePercentage > 95 && (blackPercentage + colorPercentage) < 5) {
                        pageCost = 0.05; // Página casi blanca
                    } else if (colorPercentage >= 8 && colorPercentage <= 40) {
                        pageCost = 0.30; // 8% a 40% de color (no importa el porcentaje de negro)
                    } else if (colorPercentage > 40 && colorPercentage <= 75) {
                        pageCost = 0.50; // 41% a 75% de color (no importa el porcentaje de negro)
                    } else if (colorPercentage > 75) {
                        pageCost = 1.00; // 76% a 100% de color (no importa el porcentaje de negro)
                    }

                    // Agregar el costo de la página al costo total
                    totalCost += pageCost;

                    // Mostrar el costo por hoja
                    resultDiv.innerHTML += `<p>Página ${i}: ${whitePercentage.toFixed(2)}% blanco, ${blackPercentage.toFixed(2)}% negro (incluye grises), ${colorPercentage.toFixed(2)}% colores. <strong>Precio: S/. ${pageCost.toFixed(2)}</strong></p>`;
                }

                // Mostrar el costo total
                resultDiv.innerHTML += `<p><strong>Total a pagar: S/. ${totalCost.toFixed(2)}</strong></p>`;
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert('Por favor sube un archivo PDF válido.');
    }
});
