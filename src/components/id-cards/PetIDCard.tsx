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
  };
  owner?: {
    firstName: string;
    lastName: string;
    address?: string;
    contactNumber?: string;
  };
}

export const PetIDCard: React.FC<PetIDCardProps> = ({ pet, owner }) => {
  return (
    <div className="id-card-container">
      {/* Front of Card */}
      <div className="id-card">
        {/* Header Region */}
        <div className="id-header">
          <h1>BARANGAY PET REGISTRY</h1>
          <p>Republic of the Philippines, Barangay San Isidro</p>
        </div>

        {/* Main Content Grid */}
        <div className="id-body">
          {/* Photo Region */}
          <div className="id-photo-container">
            <img 
              src={pet.photoUrl || 'https://placehold.co/300x400/png?text=Pet+Photo'} 
              alt={pet.name} 
              className="id-photo"
            />
          </div>

          {/* Info Region */}
          <div className="id-info">
            <h2 className="pet-name">{pet.name || 'Unknown Pet'}</h2>
            
            <div className="info-row">
              <span className="label">Owner:</span>
              <span className="value truncate">{owner ? `${owner.firstName} ${owner.lastName}` : 'N/A'}</span>
            </div>
            
            <div className="info-row">
              <span className="label">Address:</span>
              <span className="value truncate-2">{owner?.address || 'N/A'}</span>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <span className="label">Species</span>
                <span className="value">{pet.species || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Breed</span>
                <span className="value truncate">{pet.breed || 'N/A'}</span>
              </div>
            </div>

             <div className="info-row mt-1">
              <span className="label">Tag No:</span>
              <span className="value tag-text">{pet.tagNumber || 'PENDING'}</span>
            </div>
          </div>
        </div>

         {/* Footer/Strip */}
         <div className="id-footer-strip">
            OFFICIAL REGISTRATION DOCUMENT
         </div>
      </div>

      {/* Back of Card */}
      <div className="id-card back-face">
        <div className="back-grid">
             {/* Emergency Info */}
            <div className="section emergency-section">
                <h3>EMERGENCY INFORMATION</h3>
                <div className="content">
                    <p>If found, please return to owner:</p>
                    <p className="highlight">{owner?.contactNumber || 'No Contact Info'}</p>
                    <p className="sub">Or call Barangay Hall: (02) 8123-4567</p>
                </div>
            </div>

            {/* Vaccination Record */}
            <div className="section vacc-section">
                <h3>VACCINATION RECORD</h3>
                 <div className="vacc-row">
                    <span>Anti-Rabies:</span>
                    <div className="line"></div>
                </div>
                <div className="vacc-row">
                    <span>Deworming:</span>
                    <div className="line"></div>
                </div>
            </div>

             {/* Legal/Disclaimer */}
            <div className="section legal-section">
                <p>Registered under Brgy. Ordinance No. 123. Abandonment is punishable by law.</p>
            </div>

            {/* QR Region - FIXED ANCHOR */}
            <div className="qr-region">
                 <div className="qr-wrapper">
                    <QRCodeSVG 
                        value={`https://barangay.app/pets/${pet.tagNumber || 'check'}`}
                        size={120} // Minimum guaranteed size
                        level="H" // High error correction
                        includeMargin={false}
                        className="qr-code-svg"
                    />
                 </div>
                 <span className="qr-label">SCAN FOR RECORDS</span>
            </div>
        </div>
      </div>

      <style jsx>{`
        /* 
           CR80 Card Dimensions: 85.60mm x 53.98mm 
           We use mm for print accuracy.
        */
        .id-card-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
            align-items: center;
            background: #f0f0f0;
            padding: 20px;
        }

        .id-card {
            /* Standard CR80 Size */
            width: 85.6mm;
            height: 54mm; 
            background: white;
            border-radius: 3mm; /* Rounded corners for preview, sharp for print usually */
            overflow: hidden;
            position: relative;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            font-family: 'Arial', sans-serif;
            page-break-inside: avoid;
        }

        /* --- FRONT DESIGN --- */
        .id-header {
            background: #e11d48; /* Rose-600 */
            color: white;
            padding: 2mm 3mm;
            text-align: center;
            flex-shrink: 0;
        }
        .id-header h1 {
            margin: 0;
            font-size: 8pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .id-header p {
            margin: 0;
            font-size: 5pt;
            opacity: 0.9;
        }

        .id-body {
            display: grid;
            grid-template-columns: 28mm 1fr; /* Fixed photo width */
            gap: 3mm;
            padding: 3mm;
            flex-grow: 1;
        }

        .id-photo-container {
            width: 100%;
            height: 32mm;
            border: 1px solid #ddd;
            background: #f9f9f9;
            border-radius: 1mm;
            overflow: hidden;
        }
        .id-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .id-info {
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
            overflow: hidden; /* Prevent spillover */
        }

        .pet-name {
            margin: 0;
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a; /* Slate-900 */
            line-height: 1;
        }

        .info-row {
            display: flex;
            align-items: baseline;
            gap: 1mm;
            font-size: 7pt;
            line-height: 1.1;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2mm;
            margin-top: 1mm;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }

        .label {
            font-weight: 700;
            color: #64748b; /* Slate-500 */
            font-size: 5.5pt;
            text-transform: uppercase;
        }
        .value {
            color: #334155; /* Slate-700 */
            font-weight: 600;
            font-size: 7pt;
        }
        .tag-text {
            color: #e11d48;
            font-family: 'Courier New', monospace;
            font-weight: 800;
            letter-spacing: 0.5px;
        }

        .truncate {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .truncate-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .id-footer-strip {
            background: #f1f5f9;
            color: #94a3b8;
            text-align: center;
            font-size: 4pt;
            padding: 1mm;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: auto;
        }

        /* --- BACK DESIGN (GRID LAYOUT) --- */
        .back-face {
            padding: 0; /* Layout handled by grid */
        }

        .back-grid {
            display: grid;
            grid-template-rows: auto auto 1fr auto; /* Header, Vacc, Legal, QR */
            height: 100%;
            padding: 3mm;
            box-sizing: border-box;
            gap: 2mm;
        }

        .section h3 {
            margin: 0 0 1mm 0;
            font-size: 6pt;
            font-weight: 800;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.5mm;
            color: #475569;
            text-transform: uppercase;
        }

        .emergency-section .content {
            font-size: 6pt;
            text-align: center;
        }
        .highlight {
            font-weight: 800;
            font-size: 8pt;
            color: #000;
            margin: 0.5mm 0;
        }
        .sub {
            color: #64748b;
        }

        .vacc-row {
            display: flex;
            align-items: flex-end;
            font-size: 6pt;
            margin-bottom: 1mm;
        }
        .vacc-row span {
            width: 20mm;
            flex-shrink: 0;
            font-weight: 600;
        }
        .vacc-row .line {
            flex-grow: 1;
            border-bottom: 0.5pt solid #cbd5e1;
        }

        .legal-section p {
            font-size: 4.5pt;
            color: #94a3b8;
            text-align: justify;
            margin: 0;
            line-height: 1.1;
        }

        /* QR REGION - The Critical Requirement */
        .qr-region {
            /* 
               Grid placement: Ensure it's at the bottom.
               Usually row 4 in our definition, or use margin-top auto if flex.
               But we used grid-template-rows: ... 1fr auto
               Wait, legal is 1fr? No, let legal fill space, QR fixed.
            */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            margin-top: auto; /* Push to bottom if grid allows */
            padding-top: 1mm;
        }
        
        .qr-wrapper {
            background: white;
            padding: 1mm;
            border: 1px solid #e2e8f0;
            border-radius: 1mm;
            /* Fixed dimensions for wrapper to prevent shift */
            width: 28mm; 
            height: 28mm;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .qr-code-svg {
            width: 100% !important;
            height: 100% !important;
        }

        .qr-label {
            font-size: 4pt;
            font-weight: 700;
            color: #64748b;
            margin-top: 0.5mm;
            letter-spacing: 0.5px;
        }

        /* --- PRINT STYLES --- */
        @media print {
            @page {
                size: 85.6mm 54mm; /* Standard ID */
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
                gap: 0;
                display: block; /* Stack for print flow */
            }
            .id-card {
                margin: 0;
                border: none;
                box-shadow: none;
                border-radius: 0; /* Sharp corners for cutting */
                break-after: page; /* Ensure back is on new page or separate card */
                page-break-after: always;
                width: 85.6mm;
                height: 54mm;
            }
        }
      `}</style>
    </div>
  );
};
