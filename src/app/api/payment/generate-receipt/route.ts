// app/api/generate-receipt/route.ts
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export async function POST(request: NextRequest) {
  try {
    const paymentDetails = await request.json();

    // Create a PDF document
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on("data", (buffer) => buffers.push(buffer));
    doc.on("end", () => {});

    // Add content to PDF
    doc.fontSize(20).text("Payment Receipt", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Transaction Reference: ${paymentDetails.tx_ref}`);
    doc.text(`Amount: ${paymentDetails.amount} ${paymentDetails.currency}`);
    doc.text(
      `Date: ${new Date(paymentDetails.payment_date).toLocaleDateString()}`
    );
    doc.text(`Status: ${paymentDetails.status}`);
    doc.text(
      `Customer: ${paymentDetails.first_name} ${paymentDetails.last_name}`
    );
    doc.text(`Email: ${paymentDetails.email}`);

    doc.end();

    // Combine buffers
    const pdfBuffer = Buffer.concat(buffers);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${paymentDetails.tx_ref}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
