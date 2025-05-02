const Test = require('../models/Test');
const Setting = require('../models/Setting');
const { sequelize } = require('../config/db');

// Combined pathology and radiology test data
const testData = [
  { name: "HbA1C", price: 1000 },
  { name: "2HABF Wth CUS", price: 50 },
  { name: "OGTT", price: 250 },
  { name: "CBC", price: 500 },
  { name: "RBS", price: 100 },
  { name: "FBS With CUS", price: 50 },
  { name: "FBS & 2HABF Wth CUS", price: 100 },
  { name: "Category 1", price: 100 },
  { name: "S.CREATININE", price: 400 },
  { name: "S.BILIRUBIN TOTAL", price: 700 },
  { name: "S.URIC ACID", price: 400 },
  { name: "SGPT", price: 400 },
  { name: "ALKALINE PHOSPHATE", price: 400 },
  { name: "LIPID PROFILE", price: 1000 },
  { name: "CRP", price: 500 },
  { name: "ASO TITRE", price: 400 },
  { name: "RA", price: 400 },
  { name: "WIDAL", price: 400 },
  { name: "BLOOD GROUP", price: 150 },
  { name: "HBsAg", price: 400 },
  { name: "VDRL", price: 400 },
  { name: "H.PYLORI", price: 600 },
  { name: "S.FSH", price: 1200 },
  { name: "S.IGE LEVEL", price: 1000 },
  { name: "URINE PREGNANCY", price: 200 },
  { name: "MT", price: 400 },
  { name: "TOTAL EOSONOPHIL", price: 200 },
  { name: "BLOOD C/S", price: 2100 },
  { name: "URINE R/E", price: 200 },
  { name: "URINE C/S", price: 800 },
  { name: "STOOL R/E", price: 400 },
  { name: "STOOL C/S", price: 1000 },
  { name: "SEMEN ANALYSIS", price: 800 },
  { name: "S.TSH", price: 800 },
  { name: "S.FT4", price: 1000 },
  { name: "S.FT3", price: 1000 },
  { name: "S.T3", price: 1000 },
  { name: "S.T4", price: 1000 },
  { name: "S.PROLACTINE", price: 1200 },
  { name: "PROTHOMOBIN TIME", price: 1000 },
  { name: "S.CALCIUM", price: 500 },
  { name: "CHOLESTEROL", price: 300 },
  { name: "ICT FOR DENGU IGM", price: 500 },
  { name: "HB%", price: 200 },
  { name: "PLATELATE COUNT", price: 200 },
  { name: "REGISTRATION", price: 200 },
  { name: "TPHA", price: 400 },
  { name: "ICT FOR MALARIA", price: 600 },
  { name: "PBF", price: 300 },
  { name: "PPBS", price: 400 },
  { name: "GLUCOMITAR BY RBS", price: 50 },
  { name: "CBC Test", price: 2500 },
  { name: "ECG", price: 300 },
  { name: "GLUCOMITAR MACHINE", price: 1500 },
  { name: "OUT DOOR", price: 100 },
  { name: "GLUCOMITAR MACHINE +STRIP", price: 1700 },
  { name: "B.UREA", price: 500 },
  { name: "ELECTROLYTES", price: 1200 },
  { name: "TROPONIN I", price: 1000 },
  { name: "VITAMIN D TOTAL", price: 3000 },
  { name: "STOOL R/S", price: 300 },
  { name: "S.ALBUMIN", price: 400 },
  { name: "SGOT", price: 400 },
  { name: "HIV", price: 600 },
  { name: "MP", price: 500 },
  { name: "heat coagulation", price: 400 },
  { name: "CPK TEST", price: 1500 },
  { name: "SSF", price: 700 },
  { name: "diabetic rutin test", price: 600 },
  { name: "Feritin", price: 1500 },
  { name: "Urine ACR", price: 1400 },
  { name: "USG WHOLE ABDOMEN", price: 600 },
  { name: "USG LOWER ABDOMEN", price: 600 },
  { name: "USG PREGNANCY PROFILE", price: 600 },
  { name: "TESTOSTOREN", price: 1200 },
  { name: "USG OG KUB", price: 600 },
  { name: "echo2D", price: 1500 },
  { name: "T3", price: 1000 },
  { name: "T4", price: 1200 },
  { name: "USG OF HBS", price: 600 },
  { name: "ECHO COLOUR DOPPLER", price: 3000 },
  { name: "URINE FOR KETONEBODY", price: 250 },
  { name: "Random Lipid profile", price: 1000 },
  { name: "S.GROWTH HORMON", price: 1800 },
  { name: "S.FERRITIN", price: 1200 },
  { name: "pus for c/s", price: 800 },
  { name: "s.phosphate", price: 500 },
  { name: "USG UPPER ABDOMEN", price: 600 },
  { name: "BETA HCG", price: 1500 },
  { name: "ANTI TPO", price: 1700 },
  { name: "Xray Chest P/A Veiw", price: 550 },
  { name: "Xray Cervical Spine B/V", price: 800 },
  { name: "SPUTUM FOR AFB", price: 400 },
  { name: "SPUTUM FOR C/S", price: 800 },
  { name: "URINE FOR MICRO ALBUMIN", price: 1500 },
  { name: "FEBRILE ANTIGEN", price: 1000 },
  { name: "Out Charge", price: 1000 },
  { name: "eGFR", price: 500 },
  { name: "S.LIPASE", price: 1500 },
  { name: "IRON PROFILE", price: 4000 },
  { name: "TRIGLYCRIDE", price: 400 },
  { name: "ACCP", price: 2000 },
  { name: "MONEY RETURN BY MOJIB SIR", price: 50000 },
  { name: "Stool For OBT", price: 1000 },
  { name: "S.Amylase", price: 600 },
  { name: "ICT FOR DENGU NS1", price: 400 },
  { name: "ANTI HBE", price: 1200 },
  { name: "DRESSING CHARGE", price: 500 },
  { name: "OUT DOOR PATIEINT", price: 200 },
  { name: "OUT DOOR PATIEINT OLD", price: 100 },
  { name: "HBSAg ELISA", price: 1000 },
  { name: "CROSSMATCHING", price: 1500 },
  { name: "SERUM PSA", price: 1300 },
  { name: "ANTI HBS", price: 1500 },
  { name: "BLOOD UREA", price: 400 },
  { name: "HB ELECTROPHORESIS", price: 2200 },
  { name: "S.LH", price: 1200 },
  { name: "Urine for Strip Test", price: 200 },
  { name: "insulin Abasaglar", price: 0 }, // Changed "Free (......)Piece" to 0
  { name: "BT ,CT", price: 500 },
  { name: "APTT", price: 1000 },
  { name: "Anti Thyroid Antiboady", price: 3000 },
  { name: "S.Iron", price: 1200 },
  { name: "S.TIBC", price: 1200 },
  { name: "Inorganic Phosphate", price: 800 },
  { name: "Total protein", price: 1000 },
  { name: "Anti CCP AB", price: 2200 },
  { name: "B Cortisol Test", price: 1200 },
  { name: "Bilirubin Total", price: 500 },
  { name: "HLA B27", price: 4000 },

  // From document 2 (only those not in document 1)
  { name: "TSH", price: 1300 }, // Different price from S.TSH
  { name: "S.IgE", price: 1300 },
  { name: "Widal", price: 550 }, // Different price from WIDAL
  { name: "LFT", price: 1300 },
  { name: "Alkanine phosphatose", price: 450 },
  { name: "MT(Tuber culine test)", price: 450 },
  { name: "HBS Ag eliza method", price: 1200 },
  { name: "FBS", price: 150 },
  { name: "Lipid profile", price: 1300 }, // Different price from LIPID PROFILE
  { name: "Hemoglobin", price: 200 },
  { name: "Clotting Time(CT)", price: 200 },
  { name: "Rubella Antibody, IgM", price: 550 },
  { name: "Rubella Antibody, IgG", price: 550 },
  { name: "Adv: Serum Iron Profile.", price: 3500 },
  { name: "RBC", price: 150 },
  { name: "Serum Urea", price: 450 },
  { name: "S. ELECTROLYTES", price: 1300 },
  { name: "Bilirubin", price: 450 },
  { name: "Shoulder(A/P)", price: 500 },
  { name: "xray with report", price: 100 },
  { name: "xray of sholder joint B/V", price: 1000 },
  { name: "X-Report(X-Report)", price: 100 },
  { name: "xray of Lumber sacrail spine A/P", price: 500 },
  { name: "xray of Abdomen E/P", price: 500 },
  { name: "xray Lt.heel B/V", price: 500 },
  { name: "Xray of Lumbo sacrile spine B/V", price: 1000 },
  { name: "X-ray of Finger", price: 500 },
  { name: "X-ray of Lt+ Hip Joint", price: 500 },
  { name: "x-ray of Rt+Hip Joint", price: 500 },
  { name: "SI Joint B/V", price: 550 },
  { name: "Bamion meal stomach", price: 3500 },
  { name: "x-ray of Bamion meal +stomach", price: 3500 },
  { name: "X-RAY OF RIGHT ANKLE B/V", price: 500 },
  { name: "X-RAY OF LEFT ANKLE B/V", price: 500 },
  { name: "X-Ray Lt. Thigh B/V", price: 600 },
  { name: "X-Ray of Rt. Thigh B/V", price: 600 },
  { name: "X-RAY LT. TM JOINT B/V", price: 500 },
  { name: "X-RAY RT. TM JOINT B/V", price: 500 },
  { name: "X-RAY Of NOSE OM VIEW", price: 500 },
  { name: "X-Ray Of Rt Tibia Fibula Joint B/V", price: 500 },
  { name: "X-Ray Of Right Fore Arm B/v", price: 500 },
  { name: "X-Ray Of Left Fore Arm B/V", price: 500 },
  { name: "X-Ray Of Pelvis A/P View", price: 500 },
  { name: "X-Ray Of Left Clavical A/P View", price: 700 },
  { name: "X-Ray of Right Clavical B/V View", price: 700 },
  { name: "Usg Of Whole Abdomine (Special Attention Of KUB)", price: 1500 },
  { name: "X-Ray Of Nasopharynx Lateral View", price: 500 },
  { name: "Nasal-Bone Lataral view", price: 500 },
  { name: "X-Ray Both Hip joint B/V", price: 800 },
  { name: "X-Ray Of Rt Thing B/V", price: 500 },
  { name: "Both Ankle Joint B/V", price: 1000 },
  { name: "Thorac Spine B/V", price: 500 },
  { name: "X-Ray Throat B/V", price: 500 },
  { name: "X-RAY MASTOID TOWNS VIEW", price: 500 },
  { name: "X-Ray SI Joint B/V", price: 800 },
  { name: "X-RAY ANKLE JOINT B/V", price: 500 },
  { name: "X-Ray Lt Food B/V", price: 400 },
  { name: "X-Ray Right Foot joint B/V", price: 400 },
  { name: "X-Ray Lt Shoulder B/V", price: 600 },
  { name: "X-Ray Rt Shoulder B/V", price: 600 },
  { name: "X-Ray Lt Knee B/V", price: 600 },
  { name: "X-Ray both Knee B/V", price: 1000 },
  { name: "X-Ray Left Hand Joint B/V", price: 500 },
  { name: "X-Ray Right Hand Joint B/V", price: 500 },
  { name: "X-Ray Left Foot Joint B/V", price: 500 },
  { name: "X-Ray Right Foot Joint B/V", price: 500 },
  { name: "X-Ray Left Elbow Joint B/V", price: 500 },
  { name: "X-Ray Right Elbow Joint B/V", price: 500 },
  
];

// Function to import the data
async function importTests() {
  try {
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Insert all tests
      await Test.bulkCreate(testData, { transaction });
      
      // Update import_tast_data setting to false
      const settings = await Setting.findOne();
      if (settings) {
        await settings.update({ import_tast_data: true }, { transaction });
      }
      
      // Commit the transaction
      await transaction.commit();
      
      console.log('Tests imported successfully!');
    } catch (error) {
      // If there's an error, rollback the transaction
      await transaction.rollback();
      console.error('Error importing tests:', error);
    }
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    // Close the connection (optional, depending on your app structure)
    await sequelize.close();
  }
}

// Run the import function
importTests();