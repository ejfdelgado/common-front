import { Injectable } from "@angular/core";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

@Injectable({
    providedIn: 'root'
})
export class PDFService {
    exportHtmlToPdf = async (htmlText: string, fileName: string = "download.pdf"): Promise<void> => {

        // 1. Initialize jsPDF (p = portrait, mm = millimeters, a4 = paper size)
        const doc = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: "letter",
        });

        // 2. Use the .html() plugin
        // This automatically uses html2canvas under the hood if available
        await doc.html(htmlText, {
            callback: function (doc) {
                // 3. Save the PDF
                doc.save(fileName);
            },
            margin: [10, 10, 10, 10], // [top, left, bottom, right]
            autoPaging: 'text',       // Ensures text isn't cut off between pages
            x: 0,
            y: 0,
            width: 190,               // Target width in mm (A4 is 210mm, minus margins)
            windowWidth: 800          // Essential: Forces a consistent "screen" width for CSS rendering
        });
    }
}