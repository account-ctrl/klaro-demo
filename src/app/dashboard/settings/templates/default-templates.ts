
export const DEFAULT_BARANGAY_CLEARANCE = `<!DOCTYPE html>
<html>
<head>
    <title>Barangay Clearance - {{ resident.firstName }} {{ resident.lastName }}</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 0.5in; }
        .container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid white; }
        .header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid black; padding-bottom: 1rem; }
        .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; font-weight: normal; }
        .header h2 { font-size: 24px; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
        .header p { margin: 0; font-size: 14px; }
        .logo-left, .logo-right { position: absolute; top: 0.5in; width: 100px; height: 100px; }
        .logo-left { left: 1in; }
        .logo-right { right: 1in; }
        
        .title { text-align: center; margin: 3rem 0; }
        .title h1 { font-size: 32px; font-weight: bold; text-decoration: underline; letter-spacing: 2px; }
        
        .content { margin: 2rem 4rem; font-size: 18px; line-height: 2; text-align: justify; }
        .content p { text-indent: 4rem; margin-bottom: 1.5rem; }
        .highlight { font-weight: bold; text-transform: uppercase; }
        
        .footer { margin-top: 4rem; display: flex; justify-content: flex-end; padding-right: 4rem; }
        .signature-block { text-align: center; width: 300px; }
        .signature-line { border-bottom: 1px solid black; margin-bottom: 5px; }
        .official-name { font-weight: bold; font-size: 18px; text-transform: uppercase; }
        .official-title { font-size: 14px; font-style: italic; }
        
        .seal-note { text-align: center; font-size: 12px; margin-top: 4rem; font-style: italic; color: #555; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Optional Logos (Placeholders) -->
        <!-- <img src="https://placehold.co/100" class="logo-left" alt="Logo"> -->
        
        <div class="header">
            <h1>Republic of the Philippines</h1>
            <h1>Province of Metro Manila</h1>
            <h1>City of Quezon</h1>
            <h2>Barangay San Isidro</h2>
            <p>Office of the Punong Barangay</p>
        </div>

        <div class="title">
            <h1>BARANGAY CLEARANCE</h1>
        </div>

        <div class="content">
            <p>TO WHOM IT MAY CONCERN:</p>

            <p>THIS IS TO CERTIFY that <span class="highlight">{{ resident.firstName }} {{ resident.middleName }} {{ resident.lastName }} {{ resident.suffix }}</span>, <span class="highlight">{{ resident.age }}</span> years old, <span class="highlight">{{ resident.civilStatus }}</span>, Filipino, is a bona fide resident of this Barangay with postal address at <span class="highlight">{{ resident.address }}</span>.</p>

            <p>It is further certified that the above-named individual has no derogatory record or pending case filed against him/her in this office as of this date. He/she is known to be a person of good moral character and law-abiding citizen in the community.</p>

            <p>This CLEARANCE is being issued upon the request of the subject individual for the purpose of: <br> <span class="highlight" style="display:block; text-align:center; margin-top:10px;">{{ request.purpose }}</span></p>

            <p>ISSUED this <span class="highlight">{{ 'now' | date: 'day' }}th</span> day of <span class="highlight">{{ 'now' | date: 'month' }}</span>, <span class="highlight">{{ 'now' | date: 'year' }}</span> at Barangay San Isidro, Quezon City, Philippines.</p>
        </div>

        <div class="footer">
            <div class="signature-block">
                <div style="height: 50px;"></div> <!-- Space for signature -->
                <div class="signature-line"></div>
                <div class="official-name">HON. JUAN L. TAMAD</div>
                <div class="official-title">Punong Barangay</div>
            </div>
        </div>
        
        <div class="seal-note">
            Not valid without official dry seal.
        </div>
    </div>
</body>
</html>`;

export const DEFAULT_INDIGENCY = `<!DOCTYPE html>
<html>
<head>
    <title>Certificate of Indigency - {{ resident.firstName }} {{ resident.lastName }}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0.5in; }
        .container { width: 100%; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 2rem; border-bottom: 4px double black; padding-bottom: 1rem; }
        .header h1, .header h2 { margin: 2px; text-transform: uppercase; }
        .header h1 { font-size: 14px; font-weight: normal; }
        .header h2 { font-size: 20px; font-weight: bold; color: #003366; }
        
        .title { text-align: center; margin: 3rem 0; }
        .title h1 { font-size: 28px; font-weight: bold; text-decoration: underline; color: #cc0000; }
        
        .content { margin: 2rem 3rem; font-size: 16px; line-height: 1.8; text-align: justify; }
        .content p { text-indent: 3rem; margin-bottom: 1rem; }
        .name { font-weight: bold; text-transform: uppercase; font-size: 18px; }
        
        .footer { margin-top: 4rem; display: flex; justify-content: flex-end; padding-right: 3rem; }
        .signature-block { text-align: center; width: 250px; }
        .official-name { font-weight: bold; font-size: 16px; text-transform: uppercase; border-top: 1px solid black; padding-top: 5px; }
        .official-title { font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Republic of the Philippines</h1>
            <h1>City of Quezon</h1>
            <h2>Barangay San Isidro</h2>
            <h1>Office of the Punong Barangay</h1>
        </div>

        <div class="title">
            <h1>CERTIFICATE OF INDIGENCY</h1>
        </div>

        <div class="content">
            <p>TO WHOM IT MAY CONCERN:</p>

            <p>THIS IS TO CERTIFY that <span class="name">{{ resident.firstName }} {{ resident.lastName }}</span>, of legal age, Filipino, is a resident of <span style="font-style:italic;">{{ resident.address }}</span>, Barangay San Isidro, Quezon City.</p>
            
            <p>This is to certify further that the above-named individual belongs to an indigent family in this barangay as per records available in this office.</p>

            <p>This CERTIFICATION is issued upon the request of the interested party for the requirement of <strong>{{ request.purpose }}</strong> and for whatever legal intent it may serve.</p>

            <p>Given this {{ 'now' | date: 'long' }} at Barangay San Isidro Hall, Quezon City.</p>
        </div>

        <div class="footer">
            <div class="signature-block">
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
        .header h1 { font-size: 14px; margin: 0; text-transform: uppercase; }
        .header h2 { font-size: 22px; font-weight: bold; margin: 5px 0; }
        
        .title { text-align: center; margin-bottom: 3rem; }
        .title h1 { font-size: 30px; border: 1px solid black; display: inline-block; padding: 10px 20px; letter-spacing: 3px; }
        
        .body { margin: 0 4rem; font-size: 18px; line-height: 2; }
        .name { font-weight: bold; text-transform: uppercase; font-size: 20px; }
        
        .footer { margin-top: 4rem; text-align: right; margin-right: 4rem; }
        .signatory { display: inline-block; text-align: center; }
        .signatory-name { font-weight: bold; text-transform: uppercase; border-top: 1px solid black; padding-top: 5px; width: 250px; display: block; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Republic of the Philippines</h1>
        <h1>Barangay San Isidro</h1>
        <h1>Quezon City</h1>
    </div>

    <div class="title">
        <h1>CERTIFICATE OF RESIDENCY</h1>
    </div>

    <div class="body">
        <p>This is to certify that <span class="name">{{ resident.firstName }} {{ resident.lastName }}</span> is a bona fide resident of Barangay San Isidro, Quezon City, with postal address at {{ resident.address }}.</p>
        
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
