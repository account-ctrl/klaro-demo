import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PetIDCardProps {
  pet: {
    name: string;
    species: string;
    breed?: string;
    photoUrl?: string;
    tagNumber?: string;
    colorMarkings?: string;
    gender?: string;
    birthDate?: string;
  };
  owner?: {
    firstName: string;
    lastName: string;
    address?: string;
    contactNumber?: string;
  };
  barangay?: {
      name?: string;
      logoUrl?: string;
      cityLogoUrl?: string;
      city?: string;
      province?: string;
  };
}

export const PetIDCard: React.FC<PetIDCardProps> = ({ pet, owner, barangay }) => {
  const bgImage = barangay?.logoUrl ? `url(${barangay.logoUrl})` : 'none';

  return (
    <div className="id-card-container">
      {/* Front of Card */}
      <div className="id-card front-face">
        {/* Background Watermark */}
        <div className="watermark" style={{ backgroundImage: bgImage }}></div>

        {/* Header Region */}
        <div className="id-header">
            <div className="logo-box">
                {barangay?.cityLogoUrl ? <img src={barangay.cityLogoUrl} alt="City Logo" /> : <div className="placeholder-logo"></div>}
            </div>
            <div className="header-text">
                <p className="republic">Republic of the Philippines</p>
                <p className="province">{barangay?.city || 'City / Municipality'} • {barangay?.province || 'Province'}</p>
                <h1 className="barangay-name">{barangay?.name || 'BARANGAY NAME'}</h1>
                <p className="doc-title">ANIMAL IDENTIFICATION CARD</p>
            </div>
             <div className="logo-box">
                 {barangay?.logoUrl ? <img src={barangay.logoUrl} alt="Brgy Logo" /> : <div className="placeholder-logo"></div>}
            </div>
        </div>

        {/* Main Content Grid */}
        <div className="id-body">
          {/* Left Column: Photo & Tag */}
          <div className="left-col">
            <div className="id-photo-container">
               {pet.photoUrl ? (
                   <img src={pet.photoUrl} alt={pet.name} className="id-photo" />
               ) : (
                   <div className="no-photo">NO PHOTO</div>
               )}
            </div>
            <div className="tag-box">
                <span className="tag-label">ID NO.</span>
                <span className="tag-number">{pet.tagNumber || 'PENDING'}</span>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="right-col">
             <div className="details-group">
                <label>PET NAME</label>
                <div className="value name-value">{pet.name || 'Unknown'}</div>
             </div>

             <div className="grid-2">
                 <div className="details-group">
                    <label>SPECIES</label>
                    <div className="value">{pet.species || '-'}</div>
                 </div>
                 <div className="details-group">
                    <label>BREED</label>
                    <div className="value truncate">{pet.breed || '-'}</div>
                 </div>
             </div>

             <div className="grid-2">
                 <div className="details-group">
                    <label>SEX</label>
                    <div className="value">{pet.gender || '-'}</div>
                 </div>
                 <div className="details-group">
                    <label>COLOR/MARKINGS</label>
                    <div className="value truncate">{pet.colorMarkings || '-'}</div>
                 </div>
             </div>

             <div className="details-group mt-1">
                <label>OWNER</label>
                <div className="value truncate uppercase">{owner ? `${owner.firstName} ${owner.lastName}` : 'N/A'}</div>
             </div>

             <div className="details-group">
                <label>ADDRESS</label>
                <div className="value truncate-2 uppercase" style={{ fontSize: '6pt', lineHeight: '1.2' }}>{owner?.address || 'N/A'}</div>
             </div>
          </div>
        </div>

         {/* Footer/Strip */}
         <div className="id-footer-strip">
            <div className="footer-line"></div>
            <span>OFFICIAL DOCUMENT • NON-TRANSFERABLE</span>
         </div>
      </div>

      {/* Back of Card */}
      <div className="id-card back-face">
         <div className="watermark" style={{ backgroundImage: bgImage, opacity: 0.03 }}></div>
         
         <div className="back-content">
             {/* Emergency Header */}
            <div className="back-header">
                <h2>IN CASE OF EMERGENCY / FOUND</h2>
            </div>

            <div className="emergency-info">
                <p>Please contact the owner immediately:</p>
                <p className="contact-number">{owner?.contactNumber || 'NO CONTACT INFO'}</p>
                <p className="or-text">OR REPORT TO THE BARANGAY HALL</p>
                <p className="brgy-contact">Hotline: (02) 8123-4567</p>
            </div>

            <div className="divider"></div>

            {/* Medical / Status */}
            <div className="medical-section">
                <h3>VACCINATION STATUS</h3>
                <div className="checkbox-row">
                     <div className="cb-item">
                         <div className="box"></div> <span>Anti-Rabies</span>
                     </div>
                     <div className="cb-item">
                         <div className="box"></div> <span>Deworming</span>
                     </div>
                </div>
                <div className="notes-area">
                    <span>Notes:</span>
                    <div className="line"></div>
                </div>
            </div>

            <div className="spacer"></div>

            {/* Bottom Section: QR & Legal */}
            <div className="bottom-row">
                 <div className="legal-col">
                     <p className="legal-text">
                        This card certifies that the animal described herein is registered under Barangay Ordinance No. 123.
                     </p>
                     <p className="legal-text">
                        Valid until revoked. Ensure annual vaccination updates.
                     </p>
                     
                     <div className="signature-area">
                        <div className="sig-line"></div>
                        <span className="sig-label">Barangay Captain</span>
                     </div>
                 </div>

                 {/* ANCHORED QR REGION */}
                 <div className="qr-col">
                     <div className="qr-border">
                        <QRCodeSVG 
                            value={`https://barangay.app/pets/${pet.tagNumber || 'check'}`}
                            size={80} 
                            level="M"
                            className="qr-code-svg"
                        />
                     </div>
                     <span className="qr-caption">SCAN RECORD</span>
                 </div>
            </div>
         </div>
      </div>

      <style jsx>{`
        /* 
           CR80 Card Dimensions: 85.60mm x 53.98mm 
        */
        .id-card-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
            align-items: center;
            background: #e2e8f0;
            padding: 20px;
            font-family: 'Arial', sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        .id-card {
            width: 85.6mm;
            height: 54mm; 
            background: #fff;
            border-radius: 3mm;
            overflow: hidden;
            position: relative;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
            color: #1e293b;
        }

        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60%;
            height: 60%;
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            opacity: 0.05;
            pointer-events: none;
            z-index: 0;
            filter: grayscale(100%);
        }

        /* FRONT FACE STYLES */
        .id-header {
            background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%); /* Blue Theme */
            color: white;
            padding: 1.5mm 2mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 12mm;
            position: relative;
            z-index: 1;
        }

        .logo-box {
            width: 9mm;
            height: 9mm;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-box img { width: 100%; height: 100%; object-fit: contain; }
        .placeholder-logo { width: 80%; height: 80%; border-radius: 50%; border: 1px dashed rgba(255,255,255,0.5); }

        .header-text {
            flex-grow: 1;
            text-align: center;
            line-height: 1.1;
        }
        .republic { font-size: 3.5pt; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin: 0; }
        .province { font-size: 3.5pt; text-transform: uppercase; margin: 0 0 1px 0; opacity: 0.9; }
        .barangay-name { font-size: 7.5pt; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .doc-title { font-size: 4pt; font-weight: 700; background: rgba(0,0,0,0.2); padding: 0.5mm 2mm; border-radius: 2mm; display: inline-block; margin-top: 0.5mm; letter-spacing: 1px; }

        .id-body {
            display: flex;
            padding: 3mm;
            gap: 3mm;
            flex-grow: 1;
            position: relative;
            z-index: 1;
        }

        .left-col {
            width: 24mm;
            display: flex;
            flex-direction: column;
            gap: 2mm;
        }
        
        .id-photo-container {
            width: 24mm;
            height: 28mm;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 1mm;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .id-photo { width: 100%; height: 100%; object-fit: cover; }
        .no-photo { font-size: 4pt; color: #94a3b8; text-align: center; font-weight: bold; }

        .tag-box {
            text-align: center;
        }
        .tag-label { display: block; font-size: 3.5pt; font-weight: 700; color: #64748b; margin-bottom: 0.5mm; }
        .tag-number { 
            display: block; 
            font-size: 7pt; 
            font-weight: 800; 
            color: #dc2626; 
            font-family: 'Courier New', monospace; 
            background: #fef2f2;
            border: 1px solid #fee2e2;
            border-radius: 1mm;
            padding: 0.5mm;
        }

        .right-col {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
        }

        .details-group {
            display: flex;
            flex-direction: column;
        }
        .details-group label {
            font-size: 3.5pt;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 0.2mm;
        }
        .value {
            font-size: 7pt;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.5mm;
        }
        .name-value {
            font-size: 10pt;
            font-weight: 900;
            color: #1e40af;
            text-transform: uppercase;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2mm;
        }

        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .id-footer-strip {
            background: #1e40af;
            height: 4mm;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .footer-line { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.2); }
        .id-footer-strip span { color: white; font-size: 3.5pt; letter-spacing: 2px; font-weight: 700; }

        /* BACK FACE STYLES */
        .back-content {
            padding: 3mm;
            height: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
            z-index: 1;
        }

        .back-header {
            text-align: center;
            border-bottom: 2px solid #dc2626;
            margin-bottom: 2mm;
        }
        .back-header h2 {
            margin: 0;
            color: #dc2626;
            font-size: 6pt;
            font-weight: 900;
            padding-bottom: 0.5mm;
        }

        .emergency-info {
            text-align: center;
        }
        .emergency-info p { margin: 0; font-size: 4.5pt; color: #475569; }
        .contact-number { font-size: 8pt !important; font-weight: 900; color: #000 !important; margin: 0.5mm 0 !important; }
        .or-text { font-size: 3.5pt !important; font-weight: 700; color: #94a3b8 !important; margin: 1mm 0 !important; letter-spacing: 0.5px; }
        .brgy-contact { font-weight: 700; }

        .divider { height: 1px; background: #e2e8f0; margin: 2mm 0; }

        .medical-section h3 { font-size: 5pt; font-weight: 800; color: #1e40af; margin: 0 0 1mm 0; text-transform: uppercase; }
        .checkbox-row { display: flex; gap: 4mm; margin-bottom: 1.5mm; }
        .cb-item { display: flex; align-items: center; gap: 1mm; font-size: 4.5pt; font-weight: 600; }
        .box { width: 3mm; height: 3mm; border: 0.5pt solid #64748b; background: #f8fafc; }
        .notes-area { display: flex; align-items: flex-end; gap: 1mm; }
        .notes-area span { font-size: 4pt; color: #64748b; font-weight: 700; }
        .notes-area .line { flex-grow: 1; border-bottom: 0.5pt solid #cbd5e1; }

        .spacer { flex-grow: 1; }

        .bottom-row {
            display: flex;
            align-items: flex-end;
            gap: 2mm;
            margin-top: auto;
        }

        .legal-col {
            flex-grow: 1;
        }
        .legal-text { font-size: 3.5pt; color: #64748b; margin: 0 0 1mm 0; text-align: justify; line-height: 1.2; }
        
        .signature-area { margin-top: 3mm; text-align: center; width: 25mm; }
        .sig-line { border-bottom: 0.5pt solid #1e293b; margin-bottom: 0.5mm; }
        .sig-label { font-size: 3.5pt; font-weight: 700; text-transform: uppercase; color: #1e293b; }

        .qr-col {
            width: 22mm;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .qr-border {
            padding: 1mm;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 1mm;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .qr-code-svg { width: 20mm !important; height: 20mm !important; }
        .qr-caption { font-size: 3.5pt; font-weight: 800; color: #1e40af; margin-top: 0.5mm; letter-spacing: 0.5px; }


        /* PRINT OVERRIDES */
        @media print {
            @page {
                size: 85.6mm 54mm;
                margin: 0;
            }
            body {
                background: white;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .id-card-container {
                background: white;
                padding: 0;
                display: block;
            }
            .id-card {
                margin: 0;
                border: none;
                box-shadow: none;
                border-radius: 0;
                break-after: page;
                page-break-after: always;
                width: 85.6mm;
                height: 54mm;
            }
            .id-card.back-face {
                break-after: auto;
                page-break-after: auto;
            }
        }
      `}</style>
    </div>
  );
};
