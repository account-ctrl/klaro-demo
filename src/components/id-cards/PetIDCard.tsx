
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
      contactNumber?: string; // Added contact number
  };
}

export const PetIDCard: React.FC<PetIDCardProps> = ({ pet, owner, barangay }) => {
  const bgImage = barangay?.logoUrl ? `url(${barangay.logoUrl})` : 'none';

  return (
    <div className="id-card-container">
      {/* Front of Card */}
      <div className="id-card front-face">
        {/* Background Pattern */}
        <div className="card-bg"></div>
        <div className="watermark" style={{ backgroundImage: bgImage }}></div>

        {/* Header */}
        <header className="id-header">
            <div className="header-logos">
                 {/* Left Logo (City) */}
                 <div className="logo-wrapper">
                    {barangay?.cityLogoUrl ? <img src={barangay.cityLogoUrl} alt="City" /> : <div className="logo-placeholder" />}
                 </div>
            </div>
            
            <div className="header-titles">
                <span className="republic-text">REPUBLIC OF THE PHILIPPINES</span>
                <span className="province-text">{barangay?.city ? `${barangay.city.toUpperCase()}` : 'CITY / MUNICIPALITY'}</span>
                <h1 className="barangay-text">{barangay?.name || 'BARANGAY NAME'}</h1>
            </div>

            <div className="header-logos">
                {/* Right Logo (Barangay) */}
                <div className="logo-wrapper">
                    {barangay?.logoUrl ? <img src={barangay.logoUrl} alt="Brgy" /> : <div className="logo-placeholder" />}
                </div>
            </div>
        </header>

        {/* Sub-header Strip */}
        <div className="subheader-strip">
            <span>OFFICIAL PET REGISTRY ID</span>
        </div>

        {/* Main Body */}
        <main className="id-body">
            {/* Photo Section */}
            <div className="photo-section">
                <div className="photo-frame">
                    {pet.photoUrl ? (
                        <img src={pet.photoUrl} alt={pet.name} className="pet-photo" />
                    ) : (
                        <div className="no-photo">
                            <span>NO PHOTO</span>
                        </div>
                    )}
                </div>
                <div className="id-number-badge">
                    <span className="id-label">ID NO.</span>
                    <span className="id-value">{pet.tagNumber || 'PENDING'}</span>
                </div>
            </div>

            {/* Details Section */}
            <div className="details-section">
                <div className="pet-name-group">
                    <h2 className="pet-name">{pet.name || 'UNKNOWN'}</h2>
                    <span className="pet-name-label">PET NAME</span>
                </div>

                <div className="info-grid">
                    <div className="info-item">
                        <label>SPECIES</label>
                        <span className="truncate">{pet.species || '-'}</span>
                    </div>
                    <div className="info-item">
                        <label>BREED</label>
                        <span className="truncate">{pet.breed || '-'}</span>
                    </div>
                    <div className="info-item">
                        <label>SEX</label>
                        <span>{pet.gender || '-'}</span>
                    </div>
                    <div className="info-item">
                        <label>COLOR</label>
                        <span className="truncate">{pet.colorMarkings || '-'}</span>
                    </div>
                </div>

                <div className="owner-group">
                    <div className="owner-row">
                        <label>OWNER:</label>
                        <span className="truncate">{owner ? `${owner.firstName} ${owner.lastName}` : 'N/A'}</span>
                    </div>
                    <div className="owner-row address-row">
                        <label>ADDR:</label>
                        <span className="truncate-2">{owner?.address || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </main>
        
        {/* Decorative Bottom Bar */}
        <div className="bottom-bar"></div>
      </div>


      {/* Back of Card */}
      <div className="id-card back-face">
        <div className="back-container">
            {/* Emergency Header */}
            <div className="emergency-header">
                <h3>IN CASE OF EMERGENCY / FOUND</h3>
            </div>

            <div className="emergency-content">
                <p className="instruction">Please contact the owner immediately:</p>
                <div className="contact-display">
                    <span className="contact-icon">📞</span>
                    <span className="contact-number">{owner?.contactNumber || 'NO CONTACT INFO'}</span>
                </div>
                
                <div className="alt-contact">
                    <p>Or surrender to the Barangay Hall</p>
                    <p className="brgy-hotline">
                        Hotline: {barangay?.contactNumber || '(02) 8123-4567'}
                    </p>
                </div>
            </div>

            <div className="divider-line"></div>

            {/* Bottom Section with QR */}
            <div className="bottom-layout">
                <div className="legal-area">
                    <div className="vacc-status">
                        <h4>VACCINATION STATUS</h4>
                        <div className="check-row">
                            <span className="checkbox"></span> Anti-Rabies
                        </div>
                         <div className="check-row">
                            <span className="checkbox"></span> Deworming
                        </div>
                    </div>
                    
                    <div className="signature-block">
                        <div className="sig-line"></div>
                        <span>Barangay Official</span>
                    </div>

                    <p className="ordinance-text">
                        Registered under Brgy. Ordinance No. 123.
                        Valid until revoked.
                    </p>
                </div>

                <div className="qr-area">
                    <div className="qr-frame">
                         <QRCodeSVG 
                            value={`https://barangay.app/pets/${pet.tagNumber || 'check'}`}
                            size={70} 
                            level="M"
                            className="qr-svg"
                        />
                    </div>
                    <span className="qr-label">SCAN RECORD</span>
                </div>
            </div>
        </div>
      </div>

      <style jsx>{`
        /* RESET & FONTS */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

        .id-card-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
            align-items: center;
            background: #f1f5f9;
            padding: 30px;
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        /* CARD BASE */
        .id-card {
            width: 85.6mm;
            height: 54mm;
            background: #ffffff;
            border-radius: 3mm;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            color: #1e293b;
        }

        /* BACKGROUND ELEMENTS */
        .card-bg {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
            background-size: 4mm 4mm;
            opacity: 0.3;
            z-index: 0;
        }
        .watermark {
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50%;
            height: 50%;
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            opacity: 0.08;
            filter: grayscale(100%);
            z-index: 0;
        }

        /* FRONT - HEADER */
        .id-header {
            height: 11mm;
            background: #0f172a; /* Slate 900 */
            display: flex;
            align-items: center;
            padding: 0 3mm;
            justify-content: space-between;
            position: relative;
            z-index: 1;
        }
        .header-logos {
            width: 9mm;
            display: flex;
            justify-content: center;
        }
        .logo-wrapper {
            width: 8mm;
            height: 8mm;
            background: white;
            border-radius: 50%;
            padding: 0.5mm;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .logo-wrapper img { width: 100%; height: 100%; object-fit: contain; }
        .logo-placeholder { width: 100%; height: 100%; border-radius: 50%; background: #cbd5e1; }

        .header-titles {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: white;
            line-height: 1;
        }
        .republic-text { font-size: 3.5pt; font-weight: 500; letter-spacing: 0.5px; opacity: 0.8; margin-bottom: 0.5mm; }
        .province-text { font-size: 4pt; font-weight: 700; letter-spacing: 0.2px; margin-bottom: 0.5mm; color: #fbbf24; }
        .barangay-text { font-size: 7.5pt; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.2px; }

        /* FRONT - SUBHEADER */
        .subheader-strip {
            height: 3.5mm;
            background: #2563eb; /* Blue 600 */
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 4pt;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            z-index: 1;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* FRONT - BODY */
        .id-body {
            flex-grow: 1;
            display: flex;
            padding: 3mm;
            gap: 3mm;
            position: relative;
            z-index: 1;
        }

        .photo-section {
            width: 25mm;
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
        }
        .photo-frame {
            width: 25mm;
            height: 28mm;
            background: #e2e8f0;
            border: 0.5mm solid #94a3b8;
            border-radius: 1.5mm;
            overflow: hidden;
        }
        .pet-photo { width: 100%; height: 100%; object-fit: cover; }
        .no-photo { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 4pt; font-weight: 700; background: #f8fafc; }
        
        .id-number-badge {
            background: #fecaca; /* Red 100 */
            border: 1px solid #f87171;
            border-radius: 1mm;
            padding: 1mm 0;
            text-align: center;
        }
        .id-label { display: block; font-size: 3pt; font-weight: 700; color: #dc2626; letter-spacing: 0.5px; margin-bottom: 0.5mm;}
        .id-value { display: block; font-size: 6.5pt; font-weight: 800; color: #991b1b; font-family: 'Courier New', monospace; letter-spacing: -0.2px; }

        .details-section {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }

        .pet-name-group {
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 0.5mm;
            margin-bottom: 2mm;
        }
        .pet-name { margin: 0; font-size: 13pt; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1; letter-spacing: -0.5px; }
        .pet-name-label { font-size: 3.5pt; font-weight: 700; color: #64748b; letter-spacing: 1px; display: block; margin-top: 0.5mm; }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            row-gap: 1.5mm;
            column-gap: 2mm;
            margin-bottom: 2mm;
        }
        .info-item { display: flex; flex-direction: column; }
        .info-item label { font-size: 3pt; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.2mm; }
        .info-item span { font-size: 6pt; font-weight: 700; color: #334155; text-transform: uppercase; }

        .owner-group {
            margin-top: auto;
            background: #f8fafc;
            border-radius: 1mm;
            padding: 1.5mm;
            border: 1px dashed #cbd5e1;
        }
        .owner-row { display: flex; align-items: baseline; gap: 1mm; margin-bottom: 0.5mm; }
        .owner-row label { font-size: 3.5pt; font-weight: 700; color: #64748b; min-width: 8mm; }
        .owner-row span { font-size: 6pt; font-weight: 700; color: #1e293b; text-transform: uppercase; }
        .address-row { align-items: flex-start; }
        .address-row span { font-size: 5pt; line-height: 1.1; }

        .bottom-bar {
            height: 2mm;
            background: linear-gradient(90deg, #2563eb 0%, #1e40af 100%);
        }

        /* BACK FACE */
        .back-container {
            padding: 3mm 4mm;
            height: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
            z-index: 1;
        }

        .emergency-header {
            text-align: center;
            background: #dc2626;
            color: white;
            padding: 1mm;
            border-radius: 1mm;
            margin-bottom: 2mm;
        }
        .emergency-header h3 { margin: 0; font-size: 5pt; font-weight: 800; letter-spacing: 0.5px; }

        .emergency-content { text-align: center; }
        .instruction { font-size: 4.5pt; margin: 0 0 1mm 0; color: #475569; font-weight: 600; }
        
        .contact-display {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 2mm;
            padding: 1mm 2mm;
            display: inline-flex;
            align-items: center;
            gap: 1mm;
            margin-bottom: 1.5mm;
        }
        .contact-icon { font-size: 6pt; }
        .contact-number { font-size: 8pt; font-weight: 900; color: #b91c1c; letter-spacing: 0.5px; }

        .alt-contact p { margin: 0; font-size: 4pt; color: #64748b; }
        .brgy-hotline { font-weight: 700; color: #1e293b; margin-top: 0.5mm !important; }

        .divider-line { height: 1px; background: #e2e8f0; margin: 2mm 0; }

        .bottom-layout {
            display: flex;
            flex-grow: 1;
            gap: 2mm;
        }

        .legal-area {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }

        .vacc-status h4 { margin: 0 0 1mm 0; font-size: 4pt; font-weight: 800; color: #2563eb; text-transform: uppercase; }
        .check-row { display: flex; align-items: center; gap: 1mm; font-size: 4.5pt; font-weight: 600; margin-bottom: 1mm; color: #334155; }
        .checkbox { width: 3mm; height: 3mm; border: 0.5pt solid #94a3b8; border-radius: 0.5mm; display: inline-block; background: #f1f5f9; }

        .signature-block { margin-top: auto; margin-bottom: 2mm; width: 25mm; text-align: center; }
        .sig-line { border-bottom: 0.5pt solid #0f172a; margin-bottom: 0.5mm; }
        .signature-block span { font-size: 3pt; font-weight: 700; text-transform: uppercase; color: #475569; }

        .ordinance-text { font-size: 3pt; color: #94a3b8; text-align: justify; margin: 0; line-height: 1.2; }

        .qr-area {
            width: 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
        }
        .qr-frame {
            padding: 1mm;
            background: white;
            border: 1px solid #cbd5e1;
            border-radius: 1mm;
            margin-bottom: 0.5mm;
        }
        .qr-label { font-size: 3.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }


        /* UTILITIES */
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* PRINT STYLES */
        @media print {
            @page {
                size: 85.6mm 54mm;
                margin: 0;
            }
            body {
                margin: 0;
                background: white;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .id-card-container {
                display: block;
                padding: 0;
                background: white;
            }
            .id-card {
                margin: 0;
                box-shadow: none;
                border-radius: 0;
                border: none;
                page-break-after: always;
                break-after: page;
                width: 85.6mm;
                height: 54mm;
            }
            .id-card.back-face {
                page-break-after: auto;
                break-after: auto;
            }
            /* Ensure high resolution for text */
            * { text-rendering: optimizeLegibility; }
        }
      `}</style>
    </div>
  );
};
