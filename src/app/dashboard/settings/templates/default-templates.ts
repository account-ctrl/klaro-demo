
export const DEFAULT_BARANGAY_CLEARANCE = `<!DOCTYPE html>
<html>
<head>
    <title>Barangay Clearance - {{ resident.firstName }} {{ resident.lastName }}</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 0.5in; color: #000; }
        .container { width: 100%; max-width: 800px; margin: 0 auto; position: relative; }
        
        /* Header */
        .header { text-align: center; line-height: 1.3; margin-bottom: 2rem; }
        .header h3 { font-size: 14px; font-weight: normal; margin: 0; text-transform: uppercase; }
        .header h2 { font-size: 16px; font-weight: bold; margin: 0; text-transform: uppercase; }
        .header h1 { font-size: 22px; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
        
        /* Logos (Placeholders) */
        .logo-left { position: absolute; top: 0; left: 0; width: 90px; height: 90px; }
        .logo-right { position: absolute; top: 0; right: 0; width: 90px; height: 90px; }

        /* Title */
        .title { text-align: center; margin: 3rem 0; }
        .title h1 { font-size: 36px; font-weight: 900; text-decoration: underline; letter-spacing: 3px; margin: 0; }

        /* Body */
        .content { margin: 0 1rem; font-size: 18px; line-height: 2; text-align: justify; }
        .content p { text-indent: 3rem; margin-bottom: 1.5rem; }
        .highlight { font-weight: bold; text-transform: uppercase; }

        /* Footer/Signatory */
        .footer { margin-top: 4rem; display: flex; justify-content: space-between; align-items: flex-end; }
        .thumbmark-box { width: 150px; height: 100px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 10px; text-transform: uppercase; margin-bottom: 10px; }
        .resident-sign { text-align: center; width: 200px; }
        .sign-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-weight: bold; text-transform: uppercase; }
        
        .official-sign { text-align: center; width: 250px; }
        .official-name { font-weight: bold; font-size: 18px; text-transform: uppercase; text-decoration: underline; }
        .official-title { font-size: 14px; }

        /* Seal */
        .seal-container { text-align: center; margin-top: 3rem; font-size: 12px; font-style: italic; color: #555; }
    </style>
</head>
<body>
    <div class="container">
        <!-- <img src="https://placehold.co/100x100?text=Logo" class="logo-left" /> -->
        <!-- <img src="https://placehold.co/100x100?text=City" class="logo-right" /> -->
        
        <div class="header">
            <h3>Republic of the Philippines</h3>
            <h3>Province of Metro Manila</h3>
            <h3>City of Quezon</h3>
            <h1>Barangay San Isidro</h1>
            <h3>Office of the Punong Barangay</h3>
        </div>

        <div class="title">
            <h1>BARANGAY CLEARANCE</h1>
        </div>

        <div class="content">
            <p>TO WHOM IT MAY CONCERN:</p>

            <p>THIS IS TO CERTIFY that <span class="highlight">{{ resident.firstName }} {{ resident.middleName }} {{ resident.lastName }} {{ resident.suffix }}</span>, <span class="highlight">{{ resident.age }}</span> years old, <span class="highlight">{{ resident.civilStatus }}</span>, Filipino, is a bona fide resident of this Barangay with postal address at <span class="highlight">{{ resident.address }}</span>.</p>

            <p>It is further certified that the above-named individual has <strong>NO DEROGATORY RECORD</strong> or pending case filed against him/her in this office as of this date. He/she is known to be a person of good moral character and a law-abiding citizen in the community.</p>

            <p>This CLEARANCE is being issued upon the request of the subject individual for the purpose of:</p>
            
            <div style="text-align: center; font-weight: bold; font-size: 20px; text-transform: uppercase; margin: 20px 0; text-decoration: underline;">
                {{ request.purpose }}
            </div>

            <p>ISSUED this <span class="highlight">{{ 'now' | date: 'day' }}th</span> day of <span class="highlight">{{ 'now' | date: 'month' }}</span>, <span class="highlight">{{ 'now' | date: 'year' }}</span> at Barangay San Isidro, Quezon City, Philippines.</p>
        </div>

        <div class="footer">
            <div class="resident-sign">
                <div class="thumbmark-box">Right Thumbmark</div>
                <div class="sign-line">Signature of Applicant</div>
            </div>

            <div class="official-sign">
                <div class="official-name">HON. JUAN L. TAMAD</div>
                <div class="official-title">Punong Barangay</div>
            </div>
        </div>
        
        <div class="seal-container">
            (Not valid without official dry seal)
        </div>
    </div>
</body>
</html>`;

export const DEFAULT_INDIGENCY = `<!DOCTYPE html>
<html>
<head>
    <title>Certificate of Indigency - {{ resident.firstName }} {{ resident.lastName }}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0.5in; color: #000; }
        .container { width: 100%; max-width: 800px; margin: 0 auto; }
        
        .header { text-align: center; margin-bottom: 2rem; border-bottom: 3px double #000; padding-bottom: 1rem; }
        .header h3 { margin: 2px; font-weight: normal; font-size: 14px; text-transform: uppercase; }
        .header h1 { margin: 5px; font-weight: bold; font-size: 22px; text-transform: uppercase; }
        
        .title { text-align: center; margin: 3rem 0; }
        .title h1 { font-size: 32px; font-weight: bold; color: #000; text-decoration: underline; }
        
        .content { margin: 2rem 2rem; font-size: 16px; line-height: 1.8; text-align: justify; }
        .content p { text-indent: 3rem; margin-bottom: 1.5rem; }
        
        .name { font-weight: bold; text-transform: uppercase; font-size: 18px; }
        
        .footer { margin-top: 4rem; display: flex; justify-content: flex-end; padding-right: 2rem; }
        .official-sign { text-align: center; width: 250px; }
        .official-name { font-weight: bold; font-size: 16px; text-transform: uppercase; border-top: 1px solid #000; padding-top: 5px; }
        .official-title { font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h3>Republic of the Philippines</h3>
            <h3>City of Quezon</h3>
            <h1>Barangay San Isidro</h1>
            <h3>Office of the Punong Barangay</h3>
        </div>

        <div class="title">
            <h1>CERTIFICATE OF INDIGENCY</h1>
        </div>

        <div class="content">
            <p>TO WHOM IT MAY CONCERN:</p>

            <p>THIS IS TO CERTIFY that <span class="name">{{ resident.firstName }} {{ resident.lastName }}</span>, of legal age, Filipino, is a resident of <span style="font-style:italic;">{{ resident.address }}</span>, Barangay San Isidro, Quezon City.</p>
            
            <p>This is to certify further that the above-named individual belongs to an <strong>INDIGENT FAMILY</strong> in this barangay as per records available in this office.</p>

            <p>This CERTIFICATION is issued upon the request of the interested party for the requirement of <strong>{{ request.purpose }}</strong> (e.g., Medical Assistance, Scholarship, 4Ps, Legal Assistance) and for whatever legal intent it may serve.</p>

            <p>Given this {{ 'now' | date: 'long' }} at Barangay San Isidro Hall, Quezon City.</p>
        </div>

        <div class="footer">
            <div class="official-sign">
                <div style="height: 60px;"></div>
                <div class="official-name">HON. JUAN L. TAMAD</div>
                <div class="official-title">Punong Barangay</div>
            </div>
        </div>
    </div>
</body>
</html>`;

export const DEFAULT_RESIDENCY = `<!DOCTYPE html>
<html>
<head>
    <title>Certificate of Residency - {{ resident.firstName }} {{ resident.lastName }}</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 0.5in; }
        .header { text-align: center; margin-bottom: 3rem; }
        .header h3 { font-size: 14px; margin: 0; text-transform: uppercase; font-weight: normal; }
        .header h1 { font-size: 24px; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
        
        .title { text-align: center; margin-bottom: 3rem; }
        .title h1 { font-size: 30px; border: 2px solid #000; display: inline-block; padding: 10px 30px; letter-spacing: 3px; border-radius: 5px; }
        
        .body { margin: 0 3rem; font-size: 18px; line-height: 2; text-align: justify; }
        .name { font-weight: bold; text-transform: uppercase; font-size: 20px; }
        
        .footer { margin-top: 5rem; text-align: right; margin-right: 3rem; }
        .signatory { display: inline-block; text-align: center; }
        .signatory-name { font-weight: bold; text-transform: uppercase; border-top: 1px solid #000; padding-top: 5px; width: 280px; display: block; font-size: 16px; }
    </style>
</head>
<body>
    <div class="header">
        <h3>Republic of the Philippines</h3>
        <h3>Barangay San Isidro</h3>
        <h1>Quezon City</h1>
    </div>

    <div class="title">
        <h1>CERTIFICATE OF RESIDENCY</h1>
    </div>

    <div class="body">
        <p>This is to certify that <span class="name">{{ resident.firstName }} {{ resident.lastName }}</span> is a bona fide resident of Barangay San Isidro, Quezon City, with postal address at <strong>{{ resident.address }}</strong>.</p>
        
        <p>Based on our records, he/she has been residing in this barangay since <strong>{{ resident.household.moveInDate | default: '2010' }}</strong>.</p>
        
        <p>This certification is issued for <strong>{{ request.purpose }}</strong>.</p>
        
        <p>Issued on {{ 'now' | date: 'long' }}.</p>
    </div>

    <div class="footer">
        <div class="signatory">
            <div style="height:50px;"></div>
            <span class="signatory-name">BARANGAY SECRETARY</span>
            <span>Barangay Secretary</span>
        </div>
    </div>
</body>
</html>`;

export const DEFAULT_BUSINESS_CLEARANCE = `<!DOCTYPE html>
<html>
<head>
    <title>Barangay Business Clearance</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 0.5in; }
        .container { max-width: 800px; margin: 0 auto; border: 5px double #000; padding: 30px; }
        
        .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
        .header h3 { margin: 0; font-size: 14px; font-weight: normal; text-transform: uppercase; }
        .header h1 { margin: 5px 0; font-size: 24px; font-weight: bold; text-transform: uppercase; }
        
        .title { text-align: center; margin-bottom: 30px; }
        .title h1 { font-size: 28px; font-weight: bold; color: #000; text-decoration: underline; }
        
        .content { font-size: 16px; line-height: 1.6; }
        .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .label { font-weight: bold; width: 200px; }
        .value { border-bottom: 1px solid #000; flex-grow: 1; font-weight: bold; padding-left: 10px; }
        
        .footer { margin-top: 50px; text-align: center; }
        .validity { font-size: 12px; font-style: italic; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h3>Republic of the Philippines</h3>
            <h3>Quezon City</h3>
            <h1>Barangay San Isidro</h1>
            <h3>Business Permit & Licensing Office</h3>
        </div>

        <div class="title">
            <h1>BARANGAY BUSINESS CLEARANCE</h1>
        </div>

        <div class="content">
            <p>Clearance is hereby granted to:</p>
            
            <div class="row">
                <span class="label">Business Name:</span>
                <span class="value">{{ request.purpose }}</span> 
            </div>
            <div class="row">
                <span class="label">Owner / Operator:</span>
                <span class="value">{{ resident.firstName }} {{ resident.lastName }}</span>
            </div>
            <div class="row">
                <span class="label">Business Address:</span>
                <span class="value">{{ resident.address }}</span>
            </div>
            <div class="row">
                <span class="label">Date Issued:</span>
                <span class="value">{{ 'now' | date: 'long' }}</span>
            </div>
            
            <p style="margin-top: 30px; text-align: justify;">
                This clearance is issued after conforming with the requirements set forth by the Barangay Ordinances. This is valid only within the premises of this Barangay and shall be renewed annually.
            </p>
        </div>

        <div class="footer">
            <div style="display: inline-block; text-align: center; width: 300px; margin-top: 30px;">
                <div style="border-bottom: 1px solid #000; font-weight: bold;">HON. JUAN L. TAMAD</div>
                <div>Punong Barangay</div>
            </div>
            
            <div class="validity">
                Valid until December 31, {{ 'now' | date: 'year' }} unless revoked for cause.
            </div>
        </div>
    </div>
</body>
</html>`;

export const DEFAULT_SUMMONS = `<!DOCTYPE html>
<html>
<head>
    <title>Barangay Summons (Patawag)</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0.5in; }
        .header { text-align: center; margin-bottom: 2rem; }
        .header h1 { font-size: 18px; font-weight: bold; margin: 0; }
        
        .kp-header { text-align: center; margin-bottom: 2rem; font-weight: bold; }
        
        .title { text-align: center; margin: 2rem 0; }
        .title h1 { font-size: 24px; font-weight: bold; text-decoration: underline; }
        
        .content { margin: 0 2rem; font-size: 16px; line-height: 1.5; }
        
        .parties { display: flex; justify-content: space-between; margin-bottom: 2rem; }
        .party-box { width: 45%; border: 1px solid #ccc; padding: 10px; }
        
        .footer { margin-top: 4rem; text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <p>Republic of the Philippines<br>City of Quezon<br>Barangay San Isidro<br>OFFICE OF THE LUPONG TAGAPAMAYAPA</p>
    </div>

    <div class="kp-header">
        Barangay Case No. _______<br>
        For: {{ request.purpose }}
    </div>

    <div class="parties">
        <div class="party-box">
            <strong>Complainant/s:</strong><br><br>
            {{ resident.firstName }} {{ resident.lastName }}<br>
            {{ resident.address }}
        </div>
        <div class="party-box">
            <strong>Respondent/s:</strong><br><br>
            _______________________<br>
            _______________________
        </div>
    </div>

    <div class="title">
        <h1>S U M M O N S</h1>
    </div>

    <div class="content">
        <p><strong>TO THE RESPONDENT/S NAMED ABOVE:</strong></p>
        
        <p>You are hereby summoned to appear before me in person, together with your witnesses, on the _______ day of _______________, 20____ at ___________ o'clock in the morning/afternoon, then and there to answer to a complaint made before me, copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.</p>
        
        <p>You are hereby warned that if you refuse or willfully fail to appear in obedience to this summons, you may be barred from filing any counterclaim arising from said complaint.</p>
        
        <p>FAIL NOT or else face punishment for contempt of court.</p>
    </div>

    <div class="footer">
        <div style="display: inline-block; text-align: center; width: 250px;">
            _______________________<br>
            <strong>Punong Barangay / Lupon Chairman</strong>
        </div>
    </div>
</body>
</html>`;
