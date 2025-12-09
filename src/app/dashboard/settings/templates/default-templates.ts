
export const DEFAULT_BARANGAY_CLEARANCE = `
<div class="document-container" style="font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6;">
    <div class="header" style="text-align: center; margin-bottom: 40px;">
        <p style="margin: 0; font-size: 12pt;">Republic of the Philippines</p>
        <p style="margin: 0; font-size: 12pt;">Province of {{ settings.province }}</p>
        <p style="margin: 0; font-size: 12pt;">City/Municipality of {{ settings.city }}</p>
        <h2 style="margin: 10px 0 0 0; font-weight: bold; text-transform: uppercase;">BARANGAY {{ settings.barangayName }}</h2>
        <h1 style="margin: 20px 0; font-size: 24pt; font-weight: bold; text-decoration: underline;">OFFICE OF THE PUNONG BARANGAY</h1>
    </div>

    <div class="title" style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28pt; font-weight: bold; letter-spacing: 2px;">BARANGAY CLEARANCE</h1>
    </div>

    <div class="content" style="font-size: 12pt; text-align: justify;">
        <p><strong>TO WHOM IT MAY CONCERN:</strong></p>

        <p>THIS IS TO CERTIFY that <span class="highlight" style="font-weight: bold; text-transform: uppercase;">{{ resident.firstName }} {{ resident.middleName }} {{ resident.lastName }} {{ resident.suffix }}</span>, <span class="highlight">{{ resident.age }}</span> years old, <span class="highlight">{{ resident.civilStatus }}</span>, Filipino, is a bona fide resident of this Barangay with postal address at <span class="highlight">{{ resident.address }}</span>.</p>
        
        <p>It is further certified that the above-named individual has <strong>NO DEROGATORY RECORD</strong> or pending case filed against him/her in this office as of this date. He/she is known to be a person of good moral character and a law-abiding citizen in the community.</p>

        <p>This <strong>CLEARANCE</strong> is hereby issued upon the request of the subject person for the requirement of <strong>{{ request.purpose }}</strong> and for whatever legal intent it may serve.</p>

        <p>Given this {{ 'now' | date: 'long' }} at Barangay {{ settings.barangayName }} Hall, {{ settings.city }}, {{ settings.province }}.</p>
    </div>

    <div class="footer" style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div class="thumb" style="width: 150px; text-align: center;">
            <div style="height: 100px; border: 1px solid #000; margin-bottom: 5px;"></div>
            <p>Signature over Printed Name</p>
        </div>
        <div class="official" style="text-align: center; width: 250px;">
            <p style="font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000;">{{ settings.captainProfile.name }}</p>
            <p>Punong Barangay</p>
        </div>
    </div>
    
    <div class="seal" style="margin-top: 20px; font-size: 10pt;">
        <p><i>Not valid without dry seal.</i></p>
        <p>OR No.: {{ request.paymentRef }}</p>
        <p>Date Issued: {{ 'now' | date: 'mediumDate' }}</p>
    </div>
</div>
`;

export const DEFAULT_INDIGENCY = `
<div class="document-container" style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.5;">
    <div class="header" style="text-align: center; margin-bottom: 40px;">
        <p style="margin: 0;">Republic of the Philippines</p>
        <p style="margin: 0;">{{ settings.city }}, {{ settings.province }}</p>
        <h2 style="margin: 5px 0; font-weight: bold;">BARANGAY {{ settings.barangayName }}</h2>
        <hr style="border: 2px solid black; margin-top: 10px;" />
    </div>

    <div class="title" style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 24pt; font-weight: bold;">CERTIFICATE OF INDIGENCY</h1>
    </div>

    <div class="content" style="font-size: 12pt; text-align: justify;">
        <p><strong>TO WHOM IT MAY CONCERN:</strong></p>

        <p>THIS IS TO CERTIFY that <span class="name" style="font-weight: bold; text-transform: uppercase;">{{ resident.firstName }} {{ resident.lastName }}</span>, of legal age, Filipino, is a resident of <span style="font-style:italic;">{{ resident.address }}</span>, Barangay {{ settings.barangayName }}.</p>
        
        <p>This is to certify further that the above-named individual belongs to an <strong>INDIGENT FAMILY</strong> in this barangay as per records available in this office.</p>

        <p>This CERTIFICATION is issued upon the request of the interested party for the requirement of <strong>{{ request.purpose }}</strong> (e.g., Medical Assistance, Scholarship, 4Ps, Legal Assistance) and for whatever legal intent it may serve.</p>

        <p>Given this {{ 'now' | date: 'long' }} at Barangay {{ settings.barangayName }} Hall.</p>
    </div>

    <div class="footer" style="margin-top: 80px; text-align: right;">
        <div style="display: inline-block; text-align: center; width: 250px;">
             <p style="font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000;">{{ settings.captainProfile.name }}</p>
            <p>Punong Barangay</p>
        </div>
    </div>
</div>
`;

export const DEFAULT_RESIDENCY = `
<div class="document-container" style="font-family: Arial, sans-serif; padding: 40px;">
    <div class="header" style="text-align: center; margin-bottom: 30px;">
        <h3>Republic of the Philippines</h3>
        <h3>{{ settings.city }}</h3>
        <h1>BARANGAY {{ settings.barangayName }}</h1>
    </div>

    <div class="title" style="text-align: center; margin-bottom: 30px;">
        <h2>CERTIFICATE OF RESIDENCY</h2>
    </div>

    <div class="content" style="line-height: 1.6;">
        <p><strong>TO WHOM IT MAY CONCERN:</strong></p>

        <p>THIS IS TO CERTIFY that <strong>{{ resident.firstName }} {{ resident.lastName }}</strong> is a bona fide resident of {{ resident.address }}, Barangay {{ settings.barangayName }}, {{ settings.city }}.</p>

        <p>Based on our records, he/she has been residing in this barangay since <strong>{{ resident.dateArrival | date: 'year' }}</strong>.</p>

        <p>This certification is issued upon request for <strong>{{ request.purpose }}</strong>.</p>

        <p style="margin-top: 30px;">Issued this {{ 'now' | date: 'long' }}.</p>
    </div>

    <div class="footer" style="margin-top: 60px; text-align: right;">
         <p><strong>{{ settings.captainProfile.name }}</strong><br>Punong Barangay</p>
    </div>
</div>
`;

export const DEFAULT_BUSINESS_CLEARANCE = `
<div class="document-container" style="font-family: 'Courier New', Courier, monospace; padding: 40px;">
    <div class="header" style="text-align: center; border-bottom: 2px double #000; padding-bottom: 20px; margin-bottom: 30px;">
        <h3>BARANGAY BUSINESS CLEARANCE</h3>
        <p>Barangay {{ settings.barangayName }}, {{ settings.city }}</p>
    </div>

    <div class="content">
        <p><strong>Clearance No:</strong> {{ request.requestNumber }}</p>
        <p><strong>Date:</strong> {{ 'now' | date: 'medium' }}</p>
        
        <p style="margin-top: 30px;"><strong>BUSINESS NAME:</strong> {{ request.businessName }}</p>
        <p><strong>OWNER:</strong> {{ resident.firstName }} {{ resident.lastName }}</p>
        <p><strong>ADDRESS:</strong> {{ request.businessAddress }}</p>
        
        <p style="margin-top: 30px; text-align: justify;">The above-mentioned business establishment is hereby granted this CLEARANCE to operate within the territorial jurisdiction of this Barangay, having complied with the provisions of the Barangay Revenue Ordinance.</p>
        
        <p>This clearance is valid until <strong>{{ 'now' | date_modify: '+1 year' | date: 'mediumDate' }}</strong> unless sooner revoked for cause.</p>
    </div>

    <div class="footer" style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div>
            <p>Verified by:</p>
            <br>
            <p>_____________________<br>Barangay Treasurer</p>
        </div>
        <div style="text-align: center;">
            <p>Approved by:</p>
            <br>
             <p><strong>{{ settings.captainProfile.name }}</strong><br>Punong Barangay</p>
        </div>
    </div>
</div>
`;

export const DEFAULT_SUMMONS = `
<div class="document-container" style="font-family: Arial, sans-serif; padding: 40px;">
    <div class="header" style="text-align: center;">
        <p>Republic of the Philippines</p>
        <p>Province of {{ settings.province }}</p>
        <p>City/Municipality of {{ settings.city }}</p>
        <h3>OFFICE OF THE LUPONG TAGAPAMAYAPA</h3>
    </div>
    
    <div class="content" style="margin-top: 40px;">
        <p><strong>Barangay Case No.:</strong> _________________</p>
        <p><strong>For:</strong> _________________</p>
        
        <br>
        
        <p><strong>{{ request.complainant }}</strong><br>Complainant</p>
        <p style="text-align: center;">- against -</p>
        <p><strong>{{ request.respondent }}</strong><br>Respondent</p>
        
        <h2 style="text-align: center; margin-top: 30px;">SUMMONS</h2>
        
        <p><strong>TO: {{ request.respondent }}</strong></p>
        <p>You are hereby summoned to appear before me in person, together with your witnesses, on the <strong>{{ request.hearingDate }}</strong> at <strong>{{ request.hearingTime }}</strong> in the morning/afternoon, then and there to answer to a complaint made before me, copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.</p>
        
        <p>You are hereby warned that if you refuse or willfully fail to appear in obedience to this summons, you may be barred from filing any counterclaim arising from said complaint.</p>
        
        <p>FAIL NOT or else face punishment as for contempt of court.</p>
        
        <p style="margin-top: 40px;">Done this {{ 'now' | date: 'long' }} at Barangay {{ settings.barangayName }} Hall.</p>
    </div>
    
    <div class="footer" style="margin-top: 60px; text-align: right;">
         <p><strong>{{ settings.captainProfile.name }}</strong><br>Punong Barangay / Lupon Chairman</p>
    </div>
</div>
`;
