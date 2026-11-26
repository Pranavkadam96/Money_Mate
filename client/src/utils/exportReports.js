import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from './format';

export function exportReportToPDF({
  user,
  totals,
  categorySpending = [],
  transactions = [],
  dateRangeLabel = 'All Time',
}) {
  const currency = user?.currency || 'INR';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // Header Banner
  doc.setFillColor(15, 30, 61); // Dark Navy
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 86, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MoneyMate — Financial Analytics Report', 40, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(185, 204, 230);
  doc.text(
    `Prepared for: ${user?.name || 'User'} (${user?.email || ''})  |  Period: ${dateRangeLabel}  |  Generated: ${formatDate(new Date())}`,
    40,
    60
  );

  // Summary Table
  doc.setTextColor(15, 30, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Executive Financial Summary', 40, 118);

  autoTable(doc, {
    startY: 128,
    head: [['Total Income', 'Total Expenses', 'Net Savings', 'Savings Rate', 'Transactions']],
    body: [
      [
        formatCurrency(totals?.totalIncome || 0, currency),
        formatCurrency(totals?.totalExpenses || 0, currency),
        formatCurrency(totals?.netSavings || 0, currency),
        `${totals?.savingsRate || 0}%`,
        String(totals?.transactionCount || transactions.length),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 8 },
  });

  // Category Breakdown
  let nextY = doc.lastAutoTable.finalY + 24;
  if (categorySpending.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Expense Category Breakdown', 40, nextY);

    autoTable(doc, {
      startY: nextY + 10,
      head: [['Category', 'Amount Spent', 'Share (%)']],
      body: categorySpending.map((c) => [
        c.category,
        formatCurrency(c.amount, currency),
        `${c.percentage}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 30, 61], textColor: 255 },
      styles: { fontSize: 9.5, cellPadding: 6 },
    });
    nextY = doc.lastAutoTable.finalY + 24;
  }

  // Transactions Ledger
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Transaction Ledger', 40, nextY);

  autoTable(doc, {
    startY: nextY + 10,
    head: [['Date', 'Type', 'Category', 'Description', 'Payment Method', 'Amount']],
    body: transactions.map((t) => [
      formatDate(t.date),
      t.type.toUpperCase(),
      t.category,
      t.description,
      t.paymentMethod,
      formatCurrency(t.amount, currency),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 5 },
    columnStyles: {
      5: { halign: 'right' },
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`MoneyMate_Report_${stamp}.pdf`);
}

export function exportReportToExcel({
  user,
  totals,
  categorySpending = [],
  transactions = [],
  dateRangeLabel = 'All Time',
}) {
  const currency = user?.currency || 'INR';
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    ['MoneyMate — Financial Report'],
    ['Account Holder', user?.name || ''],
    ['Email', user?.email || ''],
    ['Currency', currency],
    ['Period', dateRangeLabel],
    ['Generated On', formatDate(new Date())],
    [],
    ['Metric', 'Value'],
    ['Total Income', Number(totals?.totalIncome || 0)],
    ['Total Expenses', Number(totals?.totalExpenses || 0)],
    ['Net Savings', Number(totals?.netSavings || 0)],
    ['Savings Rate (%)', Number(totals?.savingsRate || 0)],
    ['Transaction Count', Number(totals?.transactionCount || transactions.length)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Sheet 2: Category Breakdown
  const catRows = categorySpending.map((c) => ({
    Category: c.category,
    [`Amount (${currency})`]: Number(c.amount),
    'Share (%)': Number(c.percentage),
  }));
  const catSheet = XLSX.utils.json_to_sheet(
    catRows.length > 0 ? catRows : [{ Category: 'No expenses', [`Amount (${currency})`]: 0, 'Share (%)': 0 }]
  );
  XLSX.utils.book_append_sheet(wb, catSheet, 'Category Breakdown');

  // Sheet 3: Transactions
  const txRows = transactions.map((t) => ({
    Date: new Date(t.date).toISOString().slice(0, 10),
    Type: t.type,
    Category: t.category,
    Description: t.description,
    'Payment Method': t.paymentMethod,
    [`Amount (${currency})`]: Number(t.amount),
    Notes: t.notes || '',
  }));
  const txSheet = XLSX.utils.json_to_sheet(
    txRows.length > 0
      ? txRows
      : [
          {
            Date: '',
            Type: '',
            Category: '',
            Description: 'No transactions in selected period',
            'Payment Method': '',
            [`Amount (${currency})`]: 0,
            Notes: '',
          },
        ]
  );
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `MoneyMate_Report_${stamp}.xlsx`);
}
