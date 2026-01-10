import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  },
  Courier: {
    normal: 'Courier',
    bold: 'Courier-Bold',
    italics: 'Courier-Oblique',
    bolditalics: 'Courier-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

export const generateAgreementPDF = (data: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    
    // --- THEME: CORPORATE MEDIUM BLUE ---
    const theme = {
      sidebar: '#1e3a8a',     // Dark Navy Blue (Sidebar)
      primary: '#2563eb',     // Royal Blue (Headings)
      accent: '#3b82f6',      // Bright Blue (Links)
      text: '#1e293b',        // Dark Slate (Body)
      lightText: '#64748b',   // Muted Slate
      border: '#cbd5e1',      // Gray Borders
      white: '#ffffff',
      bgLight: '#f8fafc',     // Very Light Gray
      success: '#059669',     // Green
      gold: '#b45309'         // Gold/Warning
    };

    // Helper: Safe ID Comparison
    const getSigForParty = (partyId: string) => {
      if (!partyId) return undefined;
      return data.signatures.find((s: any) => String(s.signerId) === String(partyId));
    };

    // Direct Download Link
    const downloadUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/agreements/verify/${data.meta.id}/download`;

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      // Left margin 70px to clear the 50px sidebar
      pageMargins: [70, 40, 40, 60], 
      defaultStyle: { font: 'Roboto', fontSize: 10, color: theme.text, lineHeight: 1.3 },

      // --- 1. SIDEBAR: CANVAS + CALCULATED POSITION ---
      background: (currentPage, pageSize) => {
        const watermarkText = data.meta.id.replace(/-/g, ' ');
        
        const sidebarWidth = 50;

        // Fine-tune this if vertical centering is slightly off (test with your PDF output)
        // Approx: 15 letters * (fontSize 22 + margin 4 + lineHeight adjustment) ≈ 28-30pt per letter
        const estimatedLetterHeight = 27;
        const totalTextHeight = watermarkText.length * estimatedLetterHeight;
        const startY = (pageSize.height - totalTextHeight) / 2;

        const sidebarContent: Content[] = [
          // LAYER 1: Blue sidebar rectangle
          {
            canvas: [{ type: 'rect', x: 0, y: 0, w: sidebarWidth, h: pageSize.height, color: theme.sidebar }]
          },
          // LAYER 2: Vertical stacked letters, each perfectly centered in the 50pt sidebar
          {
            absolutePosition: { x: 0, y: startY },  // Align to left edge of sidebar and vertical center
            columns: [
              {
                width: sidebarWidth,  // Critical: Restrict to sidebar width
                alignment: 'center',  // Centers every letter horizontally within the 50pt column
                stack: watermarkText.split('').map((char: string) => ({
                  text: char,
                  color: theme.white,
                  fontSize: 25,
                  bold: true,
                  lineHeight: 0.9,
                  margin: [0, 2, 0, 2],
                  opacity: 0.3,               // Makes it look like a real watermark
                  characterSpacing: 1          // Optional: slight spacing between chars
                }))
              }
            ]
          }
        ];

        return sidebarContent;
      },

      // --- FOOTER ---
      footer: (currentPage, pageCount) => ({
        margin: [70, 10, 40, 0],
        columns: [
          { text: `Page ${currentPage} of ${pageCount}`, fontSize: 8, color: theme.lightText },
          { 
             text: `HASH: ${data.meta.contentHash}`, 
             fontSize: 7, 
             font: 'Courier', 
             color: theme.lightText,
             alignment: 'right', 
          },
        ]
      }),

      content: [
        // ===============================================
        // PAGE 1: CERTIFICATE DASHBOARD
        // ===============================================
        
        // 1. HERO HEADER
        {
          stack: [
            { text: 'DIGITAL VERIFICATION CERTIFICATE', color: theme.primary, fontSize: 9, bold: true, characterSpacing: 1, margin: [0, 0, 0, 5] },
            { text: data.meta.title.toUpperCase(), color: theme.sidebar, fontSize: 22, bold: true, lineHeight: 1.2 },
            { 
               margin: [0, 8, 0, 0],
               text: [
                 { text: 'ISSUED: ', fontSize: 9, color: theme.lightText, bold: true },
                 { text: new Date().toUTCString(), fontSize: 9, color: theme.text }
               ]
            }
          ],
          margin: [0, 0, 0, 20]
        },

        // 2. METADATA STRIP
        {
          table: {
            widths: ['33%', '34%', '33%'],  // Roughly equal thirds (34% center to handle odd widths)
            body: [[
              // LEFT: STATUS
              {
                stack: [
                  { text: 'STATUS', fontSize: 8, bold: true, color: theme.lightText },
                  { 
                    text: data.meta.status.toUpperCase(), 
                    fontSize: 10, 
                    bold: true, 
                    color: data.meta.status === 'active' ? theme.success : theme.text,
                    margin: [0, 2, 0, 0]
                  }
                ],
                fillColor: theme.bgLight,
                margin: [15, 12, 10, 12],  // Left padding for breathing room
                alignment: 'left'
              },
              // CENTER: CERTIFICATE ID
              {
                stack: [
                  { text: 'CERTIFICATE ID', fontSize: 8, bold: true, color: theme.lightText, alignment: 'center' },
                  { text: data.meta.id, fontSize: 9, font: 'Courier', bold: true, alignment: 'center', margin: [0, 2, 0, 0] }
                ],
                fillColor: theme.bgLight,
                alignment: 'center'  // Ensures entire block is centered
              },
              // RIGHT: VERSION
              {
                stack: [
                  { text: 'VERSION', fontSize: 8, bold: true, color: theme.lightText, alignment: 'right' },
                  { text: `v${data.meta.version}.0`, fontSize: 10, bold: true, alignment: 'right', margin: [0, 2, 0, 0] }
                ],
                fillColor: theme.bgLight,
                margin: [10, 12, 15, 12],  // Right padding
                alignment: 'right'
              }
            ]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 25]
        },

        // 3. PARENT AMENDMENT
        ...(data.meta.parentId ? [
          {
            table: {
              widths: ['*'],
              body: [[{
                fillColor: '#fff7ed', 
                borderColor: [theme.gold, theme.gold, theme.gold, theme.gold] as [string, string, string, string],
                stack: [
                  { text: '[ AMENDMENT NOTICE ]', color: theme.gold, bold: true, fontSize: 9, alignment: 'center' },
                  { text: `This is a child agreement derived from Parent ID: ${data.meta.parentId}`, color: '#9a3412', fontSize: 9, alignment: 'center', margin: [0, 2, 0, 0] }
                ],
                margin: [8, 5, 8, 5]
              }]]
            },
            margin: [0, 0, 0, 20]
          } as unknown as Content
        ] : []),

        // 4. SIGNATORIES
        { text: 'PARTICIPANT IDENTITIES', fontSize: 9, bold: true, color: theme.primary, margin: [0, 0, 0, 5] },
        {
          columnGap: 20,
          columns: [
            // --- PARTY A ---
            {
              table: {
                widths: ['*'],
                body: [[{
                  fillColor: theme.white,
                  borderColor: [theme.border, theme.border, theme.border, theme.border] as [string, string, string, string],
                  stack: [
                    { text: 'INITIATOR (PARTY A)', color: theme.accent, fontSize: 7, bold: true },
                    { text: data.parties.partyA.name, color: theme.text, fontSize: 12, bold: true, margin: [0, 2, 0, 10] },
                    
                    { text: 'Email:', fontSize: 7, color: theme.lightText },
                    { text: data.parties.partyA.email, fontSize: 9, margin: [0, 0, 0, 8] },
                    
                    { text: 'ID:', fontSize: 7, color: theme.lightText },
                    { text: data.parties.partyA.id, fontSize: 8, font: 'Courier', bold: true, color: theme.text, margin: [0, 0, 0, 15] },
                    
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 215, y2: 0, lineWidth: 1, lineColor: theme.border }], margin: [0, 0, 0, 10] },
                    
                    { 
                        text: getSigForParty(data.parties.partyA.id) ? 'DIGITALLY SIGNED' : 'PENDING', 
                        color: getSigForParty(data.parties.partyA.id) ? theme.success : theme.gold, 
                        fontSize: 9, 
                        bold: true, 
                        alignment: 'center' 
                    }
                  ],
                  margin: [10, 10, 10, 10]
                }]]
              }
            },
            // --- PARTY B ---
            {
              table: {
                widths: ['*'],
                body: [[{
                  fillColor: theme.white,
                  borderColor: [theme.border, theme.border, theme.border, theme.border] as [string, string, string, string],
                  stack: [
                    { text: 'RECIPIENT (PARTY B)', color: theme.accent, fontSize: 7, bold: true },
                    { text: data.parties.partyB.name, color: theme.text, fontSize: 12, bold: true, margin: [0, 2, 0, 10] },
                    
                    { text: 'Email:', fontSize: 7, color: theme.lightText },
                    { text: data.parties.partyB.email, fontSize: 9, margin: [0, 0, 0, 8] },
                    
                    { text: 'ID:', fontSize: 7, color: theme.lightText },
                    { text: data.parties.partyB.id, fontSize: 8, font: 'Courier', bold: true, color: theme.text, margin: [0, 0, 0, 15] },
                    
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 215, y2: 0, lineWidth: 1, lineColor: theme.border }], margin: [0, 0, 0, 10] },
                    
                    { 
                        text: getSigForParty(data.parties.partyB.id) ? 'DIGITALLY SIGNED' : 'PENDING', 
                        color: getSigForParty(data.parties.partyB.id) ? theme.success : theme.gold, 
                        fontSize: 9, 
                        bold: true, 
                        alignment: 'center' 
                    }
                  ],
                  margin: [10, 10, 10, 10]
                }]]
              }
            }
          ],
          margin: [0, 0, 0, 30]
        },

        // 5. TECHNICAL PROOF
        {
           table: {
               widths: ['*'],
               body: [[{
                   fillColor: theme.bgLight,
                   borderColor: [theme.border, theme.border, theme.border, theme.border] as [string, string, string, string],
                   stack: [
                       { text: 'TECHNICAL INTEGRITY PROOF', fontSize: 8, bold: true, color: theme.primary, margin: [0,0,0,5] },
                       {
                           columns: [
                               { width: '20%', text: 'DOC HASH:', fontSize: 7, bold: true, color: theme.lightText },
                               { width: '80%', text: data.meta.contentHash, fontSize: 7, font: 'Courier', color: theme.text }
                           ],
                           margin: [0, 2, 0, 2]
                       },
                       {
                           columns: [
                               { width: '20%', text: 'STORAGE CID:', fontSize: 7, bold: true, color: theme.lightText },
                               { width: '80%', text: data.meta.ipfsCid, fontSize: 7, font: 'Courier', color: theme.text }
                           ],
                           margin: [0, 2, 0, 0]
                       }
                   ],
                   margin: [10, 10, 10, 10]
               }]]
           },
           margin: [0, 0, 0, 30]
        },

        // 6. BOTTOM QR CODE (Direct Download)
        {
            table: {
                widths: ['*'],
                body: [[{
                    fillColor: theme.white,
                    border: [true, true, true, true],
                    borderColor: [theme.primary, theme.primary, theme.primary, theme.primary] as [string, string, string, string],
                    stack: [
                        { qr: downloadUrl, fit: 100, alignment: 'center', foreground: theme.sidebar },
                        { text: 'SCAN TO DOWNLOAD ORIGINAL PDF', fontSize: 7, bold: true, color: theme.primary, alignment: 'center', margin: [0, 8, 0, 0] },
                        { text: 'Verifies ID, Hash, and Signatures via Blockchain', fontSize: 6, color: theme.lightText, alignment: 'center' }
                    ],
                    margin: [15, 15, 15, 15]
                }]]
            },
            layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => theme.primary,
                vLineColor: () => theme.primary
            },
            pageBreak: 'after' // FORCE PAGE 2
        },


        // ===============================================
        // PAGE 2+: AGREEMENT CONTENT
        // ===============================================

        {
          table: {
            widths: ['*'],
            body: [[{
              fillColor: theme.primary,
              border: [false, false, false, false],
              text: 'AGREEMENT TERMS & CONDITIONS', color: theme.white, bold: true, fontSize: 11, alignment: 'center', margin: [0, 8, 0, 8]
            }]]
          },
          margin: [0, 0, 0, 20]
        },

        {
          table: {
            widths: ['*'],
            dontBreakRows: true, 
            body: [[{
              fillColor: theme.white,
              borderColor: [theme.primary, theme.primary, theme.primary, theme.primary] as [string, string, string, string],
              stack: [
                { text: data.content, fontSize: 10, lineHeight: 1.6, alignment: 'justify', color: theme.text }
              ],
              margin: [20, 20, 20, 20],
              border: [true, true, true, true]
            }]]
          },
          layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => theme.primary,
              vLineColor: () => theme.primary
          }
        },

        {
          text: '--- END OF OFFICIAL SECURE RECORD ---',
          fontSize: 8,
          color: theme.lightText,
          alignment: 'center',
          margin: [0, 40, 0, 0]
        }
      ],
      
      styles: {
        sectionHeader: { fontSize: 10, bold: true, color: theme.primary, margin: [0, 0, 0, 5], characterSpacing: 1 }
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: any[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.end();
  });
};