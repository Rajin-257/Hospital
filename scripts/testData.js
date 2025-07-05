const { sequelize } = require('../config/db');
const { runInTenantContext, getSequelize } = require('../config/db');

// Import tenant model functions
const { 
  getTenantTest, 
  getTenantTestDepartment, 
  getTenantTestCategory, 
  getTenantTestGroup, 
  getTenantSetting 
} = require('../utils/tenantModels');

// Test Department data
const departmentData = [
  { id: 1, name: "Pathology" },
  { id: 2, name: "Radiology" },
  { id: 3, name: "Biochemistry" },
  { id: 4, name: "Cardiology" },
  { id: 5, name: "General Services" }
];

// Test Category data
const categoryData = [
  // Pathology Categories
  { id: 1, name: "Hematology", test_department_id: 1 },
  { id: 2, name: "Microbiology", test_department_id: 1 },
  { id: 3, name: "Immunology", test_department_id: 1 },
  { id: 4, name: "Serology", test_department_id: 1 },
  { id: 5, name: "Parasitology", test_department_id: 1 },
  
  // Radiology Categories
  { id: 6, name: "X-Ray", test_department_id: 2 },
  { id: 7, name: "Ultrasound", test_department_id: 2 },
  { id: 8, name: "Special Procedures", test_department_id: 2 },
  
  // Biochemistry Categories
  { id: 9, name: "Clinical Chemistry", test_department_id: 3 },
  { id: 10, name: "Hormones", test_department_id: 3 },
  { id: 11, name: "Enzymes", test_department_id: 3 },
  { id: 12, name: "Diabetes Monitoring", test_department_id: 3 },
  
  // Cardiology Categories
  { id: 13, name: "Cardiac Tests", test_department_id: 4 },
  
  // General Services Categories
  { id: 14, name: "Registration & Fees", test_department_id: 5 }
];

// Test Group data
const groupData = [
  // Hematology Groups
  { id: 1, name: "Complete Blood Count", test_category_id: 1 },
  { id: 2, name: "Coagulation Studies", test_category_id: 1 },
  { id: 3, name: "Blood Banking", test_category_id: 1 },
  { id: 4, name: "Specialized Hematology", test_category_id: 1 },
  
  // Microbiology Groups
  { id: 5, name: "Blood Culture", test_category_id: 2 },
  { id: 6, name: "Urine Culture", test_category_id: 2 },
  { id: 7, name: "Stool Culture", test_category_id: 2 },
  { id: 8, name: "Other Cultures", test_category_id: 2 },
  { id: 9, name: "AFB Studies", test_category_id: 2 },
  
  // Immunology Groups
  { id: 10, name: "Infectious Disease Markers", test_category_id: 3 },
  { id: 11, name: "Autoimmune Markers", test_category_id: 3 },
  { id: 12, name: "Tumor Markers", test_category_id: 3 },
  { id: 13, name: "Allergy Testing", test_category_id: 3 },
  
  // Serology Groups
  { id: 14, name: "Viral Serology", test_category_id: 4 },
  { id: 15, name: "Bacterial Serology", test_category_id: 4 },
  { id: 16, name: "STD Screening", test_category_id: 4 },
  
  // Parasitology Groups
  { id: 17, name: "Malaria Testing", test_category_id: 5 },
  { id: 18, name: "Stool Parasites", test_category_id: 5 },
  
  // X-Ray Groups
  { id: 19, name: "Chest X-Ray", test_category_id: 6 },
  { id: 20, name: "Bone X-Ray", test_category_id: 6 },
  { id: 21, name: "Joint X-Ray", test_category_id: 6 },
  { id: 22, name: "Spine X-Ray", test_category_id: 6 },
  { id: 23, name: "Contrast Studies", test_category_id: 6 },
  { id: 24, name: "Special X-Ray", test_category_id: 6 },
  
  // Ultrasound Groups
  { id: 25, name: "Abdominal Ultrasound", test_category_id: 7 },
  { id: 26, name: "Obstetric Ultrasound", test_category_id: 7 },
  { id: 27, name: "Doppler Studies", test_category_id: 7 },
  
  // Clinical Chemistry Groups
  { id: 28, name: "Liver Function Tests", test_category_id: 9 },
  { id: 29, name: "Kidney Function Tests", test_category_id: 9 },
  { id: 30, name: "Lipid Profile", test_category_id: 9 },
  { id: 31, name: "Electrolytes", test_category_id: 9 },
  { id: 32, name: "Proteins", test_category_id: 9 },
  { id: 33, name: "Minerals", test_category_id: 9 },
  { id: 34, name: "Iron Studies", test_category_id: 9 },
  
  // Hormone Groups
  { id: 35, name: "Thyroid Function", test_category_id: 10 },
  { id: 36, name: "Reproductive Hormones", test_category_id: 10 },
  { id: 37, name: "Growth Hormones", test_category_id: 10 },
  { id: 38, name: "Stress Hormones", test_category_id: 10 },
  
  // Enzyme Groups
  { id: 39, name: "Liver Enzymes", test_category_id: 11 },
  { id: 40, name: "Cardiac Enzymes", test_category_id: 11 },
  { id: 41, name: "Pancreatic Enzymes", test_category_id: 11 },
  
  // Diabetes Monitoring Groups
  { id: 42, name: "Blood Sugar Tests", test_category_id: 12 },
  { id: 43, name: "Diabetes Monitoring", test_category_id: 12 },
  { id: 44, name: "Urine Sugar Tests", test_category_id: 12 },
  
  // Cardiac Tests Groups
  { id: 45, name: "ECG", test_category_id: 13 },
  { id: 46, name: "Echocardiography", test_category_id: 13 },
  
  // Registration & Fees Groups
  { id: 47, name: "Registration", test_category_id: 14 },
  { id: 48, name: "Consultation", test_category_id: 14 }
];

// Enhanced test data with proper categorization, units, and reference ranges
const testData = [
  // Hematology Tests - Complete Blood Count
  { name: "CBC", price: 500, test_group_id: 1, unit: "Various", bilogical_ref_range: "See individual parameters" },
  { name: "HB%", price: 200, test_group_id: 1, unit: "g/dl", bilogical_ref_range: "Male: 13.5-17.5, Female: 12.0-15.5" },
  { name: "Hemoglobin", price: 200, test_group_id: 1, unit: "g/dl", bilogical_ref_range: "Male: 13.5-17.5, Female: 12.0-15.5" },
  { name: "PLATELATE COUNT", price: 200, test_group_id: 1, unit: "×10³/μL", bilogical_ref_range: "150-450" },
  { name: "RBC", price: 150, test_group_id: 1, unit: "×10⁶/μL", bilogical_ref_range: "Male: 4.5-5.9, Female: 4.1-5.1" },
  { name: "TOTAL EOSONOPHIL", price: 200, test_group_id: 1, unit: "count/μL", bilogical_ref_range: "50-400" },
  { name: "CBC Test", price: 2500, test_group_id: 1, unit: "Various", bilogical_ref_range: "See individual parameters" },
  
  // Hematology Tests - Coagulation Studies
  { name: "PROTHOMOBIN TIME", price: 1000, test_group_id: 2, unit: "seconds", bilogical_ref_range: "11-13" },
  { name: "BT ,CT", price: 500, test_group_id: 2, unit: "minutes", bilogical_ref_range: "BT: 2-6, CT: 5-10" },
  { name: "APTT", price: 1000, test_group_id: 2, unit: "seconds", bilogical_ref_range: "25-35" },
  { name: "Clotting Time(CT)", price: 200, test_group_id: 2, unit: "minutes", bilogical_ref_range: "5-10" },
  
  // Hematology Tests - Blood Banking
  { name: "BLOOD GROUP", price: 150, test_group_id: 3, unit: "Type", bilogical_ref_range: "A, B, AB, O with Rh +/-" },
  { name: "CROSSMATCHING", price: 1500, test_group_id: 3, unit: "Compatible/Incompatible", bilogical_ref_range: "Compatible" },
  
  // Hematology Tests - Specialized
  { name: "PBF", price: 300, test_group_id: 4, unit: "Morphology", bilogical_ref_range: "Normal morphology" },
  { name: "HB ELECTROPHORESIS", price: 2200, test_group_id: 4, unit: "%", bilogical_ref_range: "HbA: 95-98%, HbA2: 2-3%, HbF: <2%" },
  
  // Microbiology Tests - Blood Culture
  { name: "BLOOD C/S", price: 2100, test_group_id: 5, unit: "Growth/No Growth", bilogical_ref_range: "No Growth" },
  
  // Microbiology Tests - Urine Culture
  { name: "URINE R/E", price: 200, test_group_id: 6, unit: "Various", bilogical_ref_range: "See individual parameters" },
  { name: "URINE C/S", price: 800, test_group_id: 6, unit: "CFU/ml", bilogical_ref_range: "<10⁵ CFU/ml" },
  { name: "Urine for Strip Test", price: 200, test_group_id: 6, unit: "Qualitative", bilogical_ref_range: "Negative for abnormal findings" },
  { name: "URINE FOR KETONEBODY", price: 250, test_group_id: 6, unit: "mg/dl", bilogical_ref_range: "Negative" },
  { name: "URINE FOR MICRO ALBUMIN", price: 1500, test_group_id: 6, unit: "mg/L", bilogical_ref_range: "<30" },
  { name: "Urine ACR", price: 1400, test_group_id: 6, unit: "mg/g", bilogical_ref_range: "<30" },
  
  // Microbiology Tests - Stool Culture
  { name: "STOOL R/E", price: 400, test_group_id: 7, unit: "Various", bilogical_ref_range: "Normal findings" },
  { name: "STOOL C/S", price: 1000, test_group_id: 7, unit: "Growth/No Growth", bilogical_ref_range: "Normal flora only" },
  { name: "STOOL R/S", price: 300, test_group_id: 7, unit: "Various", bilogical_ref_range: "Normal findings" },
  { name: "Stool For OBT", price: 1000, test_group_id: 7, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  
  // Microbiology Tests - Other Cultures
  { name: "pus for c/s", price: 800, test_group_id: 8, unit: "Growth/No Growth", bilogical_ref_range: "No pathogenic growth" },
  { name: "SPUTUM FOR C/S", price: 800, test_group_id: 8, unit: "Growth/No Growth", bilogical_ref_range: "Normal flora" },
  { name: "SEMEN ANALYSIS", price: 800, test_group_id: 8, unit: "Various", bilogical_ref_range: "WHO 2010 criteria" },
  
  // Microbiology Tests - AFB Studies  
  { name: "SPUTUM FOR AFB", price: 400, test_group_id: 9, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  { name: "MT", price: 400, test_group_id: 9, unit: "mm", bilogical_ref_range: "<5mm (negative)" },
  { name: "MT(Tuber culine test)", price: 450, test_group_id: 9, unit: "mm", bilogical_ref_range: "<5mm (negative)" },
  
  // Immunology Tests - Infectious Disease Markers
  { name: "HBsAg", price: 400, test_group_id: 10, unit: "Reactive/Non-reactive", bilogical_ref_range: "Non-reactive" },
  { name: "HBSAg ELISA", price: 1000, test_group_id: 10, unit: "Reactive/Non-reactive", bilogical_ref_range: "Non-reactive" },
  { name: "HBS Ag eliza method", price: 1200, test_group_id: 10, unit: "Reactive/Non-reactive", bilogical_ref_range: "Non-reactive" },
  { name: "HIV", price: 600, test_group_id: 10, unit: "Reactive/Non-reactive", bilogical_ref_range: "Non-reactive" },
  { name: "ANTI HBE", price: 1200, test_group_id: 10, unit: "Reactive/Non-reactive", bilogical_ref_range: "Non-reactive" },
  { name: "ANTI HBS", price: 1500, test_group_id: 10, unit: "mIU/ml", bilogical_ref_range: ">10 (Protected)" },
  { name: "H.PYLORI", price: 600, test_group_id: 10, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  
  // Immunology Tests - Autoimmune Markers
  { name: "RA", price: 400, test_group_id: 11, unit: "IU/ml", bilogical_ref_range: "<20" },
  { name: "CRP", price: 500, test_group_id: 11, unit: "mg/L", bilogical_ref_range: "<3.0" },
  { name: "ASO TITRE", price: 400, test_group_id: 11, unit: "IU/ml", bilogical_ref_range: "<200" },
  { name: "Anti CCP AB", price: 2200, test_group_id: 11, unit: "U/ml", bilogical_ref_range: "<20" },
  { name: "ANTI TPO", price: 1700, test_group_id: 11, unit: "IU/ml", bilogical_ref_range: "<34" },
  { name: "Anti Thyroid Antiboady", price: 3000, test_group_id: 11, unit: "IU/ml", bilogical_ref_range: "<4.0" },
  { name: "HLA B27", price: 4000, test_group_id: 11, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  { name: "ACCP", price: 2000, test_group_id: 11, unit: "U/ml", bilogical_ref_range: "<20" },
  
  // Immunology Tests - Tumor Markers
  { name: "SERUM PSA", price: 1300, test_group_id: 12, unit: "ng/ml", bilogical_ref_range: "<4.0" },
  { name: "BETA HCG", price: 1500, test_group_id: 12, unit: "mIU/ml", bilogical_ref_range: "Non-pregnant: <5" },
  { name: "URINE PREGNANCY", price: 200, test_group_id: 12, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  
  // Immunology Tests - Allergy Testing
  { name: "S.IGE LEVEL", price: 1000, test_group_id: 13, unit: "IU/ml", bilogical_ref_range: "<100" },
  { name: "S.IgE", price: 1300, test_group_id: 13, unit: "IU/ml", bilogical_ref_range: "<100" },
  
  // Serology Tests - Viral Serology
  { name: "ICT FOR DENGU IGM", price: 500, test_group_id: 14, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  { name: "ICT FOR DENGU NS1", price: 400, test_group_id: 14, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  { name: "Rubella Antibody, IgM", price: 550, test_group_id: 14, unit: "Index", bilogical_ref_range: "<0.9 (Negative)" },
  { name: "Rubella Antibody, IgG", price: 550, test_group_id: 14, unit: "IU/ml", bilogical_ref_range: ">15 (Immune)" },
  
  // Serology Tests - Bacterial Serology
  { name: "WIDAL", price: 400, test_group_id: 15, unit: "Titre", bilogical_ref_range: "O: <1:80, H: <1:160" },
  { name: "Widal", price: 550, test_group_id: 15, unit: "Titre", bilogical_ref_range: "O: <1:80, H: <1:160" },
  { name: "FEBRILE ANTIGEN", price: 1000, test_group_id: 15, unit: "Titre", bilogical_ref_range: "See individual antigens" },
  
  // Serology Tests - STD Screening
  { name: "VDRL", price: 400, test_group_id: 16, unit: "Reactive/Non-reactive", bilogical_ref_range: "Non-reactive" },
  { name: "TPHA", price: 400, test_group_id: 16, unit: "Reactive/Non-reactive", bilogical_ref_range: "Non-reactive" },
  
  // Parasitology Tests - Malaria Testing
  { name: "ICT FOR MALARIA", price: 600, test_group_id: 17, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  { name: "MP", price: 500, test_group_id: 17, unit: "Positive/Negative", bilogical_ref_range: "Negative" },
  
  // X-Ray Tests - Chest X-Ray
  { name: "Xray Chest P/A Veiw", price: 550, test_group_id: 19, unit: "Report", bilogical_ref_range: "Normal chest" },
  
  // X-Ray Tests - Bone X-Ray
  { name: "X-ray Lt.heel B/V", price: 500, test_group_id: 20, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-ray of Finger", price: 500, test_group_id: 20, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-ray Lt Food B/V", price: 400, test_group_id: 20, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Right Foot joint B/V", price: 400, test_group_id: 20, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Left Hand Joint B/V", price: 500, test_group_id: 20, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Right Hand Joint B/V", price: 500, test_group_id: 20, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Left Foot Joint B/V", price: 500, test_group_id: 20, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Right Foot Joint B/V", price: 500, test_group_id: 20, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  
  // X-Ray Tests - Joint X-Ray  
  { name: "X-ray of sholder joint B/V", price: 1000, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-ray of Lt+ Hip Joint", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "x-ray of Rt+Hip Joint", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "SI Joint B/V", price: 550, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-RAY OF RIGHT ANKLE B/V", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-RAY OF LEFT ANKLE B/V", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-RAY LT. TM JOINT B/V", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-RAY RT. TM JOINT B/V", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-Ray Both Hip joint B/V", price: 800, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "Both Ankle Joint B/V", price: 1000, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-Ray SI Joint B/V", price: 800, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-RAY ANKLE JOINT B/V", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-Ray Lt Shoulder B/V", price: 600, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-Ray Rt Shoulder B/V", price: 600, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-Ray Lt Knee B/V", price: 600, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-Ray both Knee B/V", price: 1000, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-Ray Left Elbow Joint B/V", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "X-Ray Right Elbow Joint B/V", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  { name: "Shoulder(A/P)", price: 500, test_group_id: 21, unit: "Report", bilogical_ref_range: "Normal joint space" },
  
  // X-Ray Tests - Spine X-Ray
  { name: "Xray Cervical Spine B/V", price: 800, test_group_id: 22, unit: "Report", bilogical_ref_range: "Normal spine alignment" },
  { name: "xray of Lumber sacrail spine A/P", price: 500, test_group_id: 22, unit: "Report", bilogical_ref_range: "Normal spine alignment" },
  { name: "Xray of Lumbo sacrile spine B/V", price: 1000, test_group_id: 22, unit: "Report", bilogical_ref_range: "Normal spine alignment" },
  { name: "Thorac Spine B/V", price: 500, test_group_id: 22, unit: "Report", bilogical_ref_range: "Normal spine alignment" },
  
  // X-Ray Tests - Contrast Studies
  { name: "Bamion meal stomach", price: 3500, test_group_id: 23, unit: "Report", bilogical_ref_range: "Normal gastric anatomy" },
  { name: "x-ray of Bamion meal +stomach", price: 3500, test_group_id: 23, unit: "Report", bilogical_ref_range: "Normal gastric anatomy" },
  
  // X-Ray Tests - Special X-Ray
  { name: "X-Ray Lt. Thigh B/V", price: 600, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray of Rt. Thigh B/V", price: 600, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-RAY Of NOSE OM VIEW", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal nasal anatomy" },
  { name: "X-Ray Of Rt Tibia Fibula Joint B/V", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Of Right Fore Arm B/v", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Of Left Fore Arm B/V", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Of Pelvis A/P View", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal pelvic anatomy" },
  { name: "X-Ray Of Left Clavical A/P View", price: 700, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray of Right Clavical B/V View", price: 700, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Of Nasopharynx Lateral View", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal nasopharyngeal anatomy" },
  { name: "Nasal-Bone Lataral view", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Of Rt Thing B/V", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal bone structure" },
  { name: "X-Ray Throat B/V", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal throat anatomy" },
  { name: "X-RAY MASTOID TOWNS VIEW", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal mastoid anatomy" },
  { name: "xray of Abdomen E/P", price: 500, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal abdominal anatomy" },
  { name: "xray with report", price: 100, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal findings" },
  { name: "X-Report(X-Report)", price: 100, test_group_id: 24, unit: "Report", bilogical_ref_range: "Normal findings" },
  
  // Ultrasound Tests - Abdominal Ultrasound
  { name: "USG WHOLE ABDOMEN", price: 600, test_group_id: 25, unit: "Report", bilogical_ref_range: "Normal abdominal organs" },
  { name: "USG LOWER ABDOMEN", price: 600, test_group_id: 25, unit: "Report", bilogical_ref_range: "Normal pelvic organs" },
  { name: "USG OG KUB", price: 600, test_group_id: 25, unit: "Report", bilogical_ref_range: "Normal KUB anatomy" },
  { name: "USG OF HBS", price: 600, test_group_id: 25, unit: "Report", bilogical_ref_range: "Normal hepatobiliary system" },
  { name: "USG UPPER ABDOMEN", price: 600, test_group_id: 25, unit: "Report", bilogical_ref_range: "Normal upper abdominal organs" },
  { name: "Usg Of Whole Abdomine (Special Attention Of KUB)", price: 1500, test_group_id: 25, unit: "Report", bilogical_ref_range: "Normal abdominal and KUB anatomy" },
  
  // Ultrasound Tests - Obstetric Ultrasound
  { name: "USG PREGNANCY PROFILE", price: 600, test_group_id: 26, unit: "Report", bilogical_ref_range: "Normal fetal development" },
  
  // Ultrasound Tests - Doppler Studies
  { name: "ECHO COLOUR DOPPLER", price: 3000, test_group_id: 27, unit: "Report", bilogical_ref_range: "Normal cardiac function" },
  
  // Clinical Chemistry Tests - Liver Function Tests
  { name: "S.BILIRUBIN TOTAL", price: 700, test_group_id: 28, unit: "mg/dl", bilogical_ref_range: "0.3-1.2" },
  { name: "Bilirubin Total", price: 500, test_group_id: 28, unit: "mg/dl", bilogical_ref_range: "0.3-1.2" },
  { name: "Bilirubin", price: 450, test_group_id: 28, unit: "mg/dl", bilogical_ref_range: "0.3-1.2" },
  { name: "S.ALBUMIN", price: 400, test_group_id: 28, unit: "g/dl", bilogical_ref_range: "3.5-5.0" },
  { name: "Total protein", price: 1000, test_group_id: 28, unit: "g/dl", bilogical_ref_range: "6.0-8.3" },
  { name: "LFT", price: 1300, test_group_id: 28, unit: "Various", bilogical_ref_range: "See individual parameters" },
  
  // Clinical Chemistry Tests - Kidney Function Tests
  { name: "S.CREATININE", price: 400, test_group_id: 29, unit: "mg/dl", bilogical_ref_range: "Male: 0.9-1.3, Female: 0.6-1.1" },
  { name: "B.UREA", price: 500, test_group_id: 29, unit: "mg/dl", bilogical_ref_range: "15-45" },
  { name: "BLOOD UREA", price: 400, test_group_id: 29, unit: "mg/dl", bilogical_ref_range: "15-45" },
  { name: "Serum Urea", price: 450, test_group_id: 29, unit: "mg/dl", bilogical_ref_range: "15-45" },
  { name: "S.URIC ACID", price: 400, test_group_id: 29, unit: "mg/dl", bilogical_ref_range: "Male: 3.5-7.2, Female: 2.6-6.0" },
  { name: "eGFR", price: 500, test_group_id: 29, unit: "ml/min/1.73m²", bilogical_ref_range: ">90" },
  
  // Clinical Chemistry Tests - Lipid Profile
  { name: "LIPID PROFILE", price: 1000, test_group_id: 30, unit: "mg/dl", bilogical_ref_range: "See individual parameters" },
  { name: "Lipid profile", price: 1300, test_group_id: 30, unit: "mg/dl", bilogical_ref_range: "See individual parameters" },
  { name: "Random Lipid profile", price: 1000, test_group_id: 30, unit: "mg/dl", bilogical_ref_range: "See individual parameters" },
  { name: "CHOLESTEROL", price: 300, test_group_id: 30, unit: "mg/dl", bilogical_ref_range: "<200" },
  { name: "TRIGLYCRIDE", price: 400, test_group_id: 30, unit: "mg/dl", bilogical_ref_range: "<150" },
  
  // Clinical Chemistry Tests - Electrolytes
  { name: "ELECTROLYTES", price: 1200, test_group_id: 31, unit: "mEq/L", bilogical_ref_range: "Na: 136-145, K: 3.5-5.1, Cl: 98-107" },
  { name: "S. ELECTROLYTES", price: 1300, test_group_id: 31, unit: "mEq/L", bilogical_ref_range: "Na: 136-145, K: 3.5-5.1, Cl: 98-107" },
  
  // Clinical Chemistry Tests - Minerals
  { name: "S.CALCIUM", price: 500, test_group_id: 33, unit: "mg/dl", bilogical_ref_range: "8.5-10.5" },
  { name: "s.phosphate", price: 500, test_group_id: 33, unit: "mg/dl", bilogical_ref_range: "2.5-4.5" },
  { name: "Inorganic Phosphate", price: 800, test_group_id: 33, unit: "mg/dl", bilogical_ref_range: "2.5-4.5" },
  { name: "VITAMIN D TOTAL", price: 3000, test_group_id: 33, unit: "ng/ml", bilogical_ref_range: "30-100" },
  
  // Clinical Chemistry Tests - Iron Studies
  { name: "IRON PROFILE", price: 4000, test_group_id: 34, unit: "μg/dl", bilogical_ref_range: "See individual parameters" },
  { name: "Adv: Serum Iron Profile.", price: 3500, test_group_id: 34, unit: "μg/dl", bilogical_ref_range: "See individual parameters" },
  { name: "S.Iron", price: 1200, test_group_id: 34, unit: "μg/dl", bilogical_ref_range: "Male: 80-180, Female: 60-170" },
  { name: "S.TIBC", price: 1200, test_group_id: 34, unit: "μg/dl", bilogical_ref_range: "250-450" },
  { name: "S.FERRITIN", price: 1200, test_group_id: 34, unit: "ng/ml", bilogical_ref_range: "Male: 20-250, Female: 10-120" },
  { name: "Feritin", price: 1500, test_group_id: 34, unit: "ng/ml", bilogical_ref_range: "Male: 20-250, Female: 10-120" },
  
  // Hormone Tests - Thyroid Function
  { name: "S.TSH", price: 800, test_group_id: 35, unit: "μIU/ml", bilogical_ref_range: "0.27-4.2" },
  { name: "TSH", price: 1300, test_group_id: 35, unit: "μIU/ml", bilogical_ref_range: "0.27-4.2" },
  { name: "S.FT4", price: 1000, test_group_id: 35, unit: "ng/dl", bilogical_ref_range: "0.93-1.7" },
  { name: "S.FT3", price: 1000, test_group_id: 35, unit: "pg/ml", bilogical_ref_range: "2.0-4.4" },
  { name: "S.T3", price: 1000, test_group_id: 35, unit: "ng/ml", bilogical_ref_range: "0.8-2.0" },
  { name: "S.T4", price: 1000, test_group_id: 35, unit: "μg/dl", bilogical_ref_range: "5.1-14.1" },
  { name: "T3", price: 1000, test_group_id: 35, unit: "ng/ml", bilogical_ref_range: "0.8-2.0" },
  { name: "T4", price: 1200, test_group_id: 35, unit: "μg/dl", bilogical_ref_range: "5.1-14.1" },
  
  // Hormone Tests - Reproductive Hormones
  { name: "S.FSH", price: 1200, test_group_id: 36, unit: "mIU/ml", bilogical_ref_range: "Varies by phase/gender" },
  { name: "S.LH", price: 1200, test_group_id: 36, unit: "mIU/ml", bilogical_ref_range: "Varies by phase/gender" },
  { name: "S.PROLACTINE", price: 1200, test_group_id: 36, unit: "ng/ml", bilogical_ref_range: "Male: 4-23, Female: 4-29" },
  { name: "TESTOSTOREN", price: 1200, test_group_id: 36, unit: "ng/dl", bilogical_ref_range: "Male: 280-1100, Female: 15-70" },
  
  // Hormone Tests - Growth Hormones
  { name: "S.GROWTH HORMON", price: 1800, test_group_id: 37, unit: "ng/ml", bilogical_ref_range: "0.4-10" },
  
  // Hormone Tests - Stress Hormones
  { name: "B Cortisol Test", price: 1200, test_group_id: 38, unit: "μg/dl", bilogical_ref_range: "6.2-19.4" },
  
  // Enzyme Tests - Liver Enzymes
  { name: "SGPT", price: 400, test_group_id: 39, unit: "U/L", bilogical_ref_range: "Male: <50, Female: <35" },
  { name: "SGOT", price: 400, test_group_id: 39, unit: "U/L", bilogical_ref_range: "Male: <40, Female: <32" },
  { name: "ALKALINE PHOSPHATE", price: 400, test_group_id: 39, unit: "U/L", bilogical_ref_range: "44-147" },
  { name: "Alkanine phosphatose", price: 450, test_group_id: 39, unit: "U/L", bilogical_ref_range: "44-147" },
  
  // Enzyme Tests - Cardiac Enzymes
  { name: "TROPONIN I", price: 1000, test_group_id: 40, unit: "ng/ml", bilogical_ref_range: "<0.04" },
  { name: "CPK TEST", price: 1500, test_group_id: 40, unit: "U/L", bilogical_ref_range: "Male: 38-174, Female: 26-140" },
  
  // Enzyme Tests - Pancreatic Enzymes
  { name: "S.LIPASE", price: 1500, test_group_id: 41, unit: "U/L", bilogical_ref_range: "10-140" },
  { name: "S.Amylase", price: 600, test_group_id: 41, unit: "U/L", bilogical_ref_range: "25-125" },
  
  // Diabetes Monitoring Tests - Blood Sugar Tests
  { name: "RBS", price: 100, test_group_id: 42, unit: "mg/dl", bilogical_ref_range: "<140" },
  { name: "FBS", price: 150, test_group_id: 42, unit: "mg/dl", bilogical_ref_range: "70-100" },
  { name: "FBS With CUS", price: 50, test_group_id: 42, unit: "mg/dl", bilogical_ref_range: "70-100" },
  { name: "FBS & 2HABF Wth CUS", price: 100, test_group_id: 42, unit: "mg/dl", bilogical_ref_range: "FBS: 70-100, 2HABF: <140" },
  { name: "2HABF Wth CUS", price: 50, test_group_id: 42, unit: "mg/dl", bilogical_ref_range: "<140" },
  { name: "PPBS", price: 400, test_group_id: 42, unit: "mg/dl", bilogical_ref_range: "<140" },
  { name: "GLUCOMITAR BY RBS", price: 50, test_group_id: 42, unit: "mg/dl", bilogical_ref_range: "<140" },
  { name: "GLUCOMITAR MACHINE", price: 1500, test_group_id: 42, unit: "Service", bilogical_ref_range: "N/A" },
  { name: "GLUCOMITAR MACHINE +STRIP", price: 1700, test_group_id: 42, unit: "Service", bilogical_ref_range: "N/A" },
  
  // Diabetes Monitoring Tests - Diabetes Monitoring
  { name: "HbA1C", price: 1000, test_group_id: 43, unit: "%", bilogical_ref_range: "<5.7% (Normal)" },
  { name: "OGTT", price: 250, test_group_id: 43, unit: "mg/dl", bilogical_ref_range: "0h:<100, 2h:<140" },
  { name: "diabetic rutin test", price: 600, test_group_id: 43, unit: "Various", bilogical_ref_range: "See individual parameters" },
  
  // Cardiac Tests - ECG
  { name: "ECG", price: 300, test_group_id: 45, unit: "Report", bilogical_ref_range: "Normal sinus rhythm" },
  
  // Cardiac Tests - Echocardiography
  { name: "echo2D", price: 1500, test_group_id: 46, unit: "Report", bilogical_ref_range: "Normal cardiac function" },
  
  // Registration & Fees - Registration
  { name: "REGISTRATION", price: 200, test_group_id: 47, unit: "Service", bilogical_ref_range: "N/A" },
  
  // Registration & Fees - Consultation
  { name: "OUT DOOR", price: 100, test_group_id: 48, unit: "Service", bilogical_ref_range: "N/A" },
  { name: "OUT DOOR PATIEINT", price: 200, test_group_id: 48, unit: "Service", bilogical_ref_range: "N/A" },
  { name: "OUT DOOR PATIEINT OLD", price: 100, test_group_id: 48, unit: "Service", bilogical_ref_range: "N/A" },
  { name: "Out Charge", price: 1000, test_group_id: 48, unit: "Service", bilogical_ref_range: "N/A" },
  { name: "DRESSING CHARGE", price: 500, test_group_id: 48, unit: "Service", bilogical_ref_range: "N/A" },
  
  // Special/Miscellaneous Tests
  { name: "Category 1", price: 100, test_group_id: null, unit: "Service", bilogical_ref_range: "N/A" },
  { name: "heat coagulation", price: 400, test_group_id: null, unit: "Test", bilogical_ref_range: "Negative" },
  { name: "SSF", price: 700, test_group_id: null, unit: "Test", bilogical_ref_range: "Normal findings" },
  { name: "insulin Abasaglar", price: 0, test_group_id: null, unit: "Free", bilogical_ref_range: "N/A" },
  { name: "MONEY RETURN BY MOJIB SIR", price: 50000, test_group_id: null, unit: "Service", bilogical_ref_range: "N/A" }
];

// Function to import hierarchical data into tenant database
async function importHierarchicalDataToTenant(tenantSequelize = null) {
  try {
    // Use provided tenant connection or get current one
    const sequelize = tenantSequelize || getSequelize();
    
    console.log('Starting hierarchical data import...');
    console.log(`Target database: ${sequelize.config.database}`);
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Get tenant-specific models
      const TestDepartment = getTenantTestDepartment();
      const TestCategory = getTenantTestCategory();
      const TestGroup = getTenantTestGroup();
      const Test = getTenantTest();
      const Setting = getTenantSetting();
      
      // Insert departments first
      console.log('Inserting test departments...');
      await TestDepartment.bulkCreate(departmentData, { 
        transaction,
        ignoreDuplicates: true 
      });
      
      // Insert categories
      console.log('Inserting test categories...');
      await TestCategory.bulkCreate(categoryData, { 
        transaction,
        ignoreDuplicates: true 
      });
      
      // Insert groups
      console.log('Inserting test groups...');
      await TestGroup.bulkCreate(groupData, { 
        transaction,
        ignoreDuplicates: true 
      });
      
      // Insert tests
      console.log('Inserting tests...');
      await Test.bulkCreate(testData, { 
        transaction,
        ignoreDuplicates: true,
        validate: false // Skip validation for faster import
      });
      
      // Update settings
      console.log('Updating settings...');
      const settings = await Setting.findOne({ transaction });
      if (settings) {
        await settings.update({ 
          import_tast_data: true 
        }, { transaction });
      }
      
      // Commit the transaction
      await transaction.commit();
      
      console.log('✅ Hierarchical test data imported successfully!');
      console.log(`- ${departmentData.length} departments`);
      console.log(`- ${categoryData.length} categories`);
      console.log(`- ${groupData.length} groups`);
      console.log(`- ${testData.length} tests`);
      
      return {
        success: true,
        message: 'Hierarchical test data imported successfully',
        counts: {
          departments: departmentData.length,
          categories: categoryData.length,
          groups: groupData.length,
          tests: testData.length
        }
      };
      
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error('❌ Error importing hierarchical test data:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

// Function to import hierarchical data (standalone version)
async function importHierarchicalData() {
  try {
    return await runInTenantContext(async () => {
      return await importHierarchicalDataToTenant();
    });
  } catch (error) {
    console.error('❌ Error in standalone import:', error);
    throw error;
  }
}

// Function to import only tests into tenant database
async function importTestsToTenant(tenantSequelize = null) {
  try {
    // Use provided tenant connection or get current one
    const sequelize = tenantSequelize || getSequelize();
    
    console.log('Starting test data import...');
    console.log(`Target database: ${sequelize.config.database}`);
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Get tenant-specific models
      const Test = getTenantTest();
      const Setting = getTenantSetting();
      
      // Insert tests
      console.log('Inserting tests...');
      await Test.bulkCreate(testData, { 
        transaction,
        ignoreDuplicates: true,
        validate: false // Skip validation for faster import
      });
      
      // Update settings
      console.log('Updating settings...');
      const settings = await Setting.findOne({ transaction });
      if (settings) {
        await settings.update({ 
          import_tast_data: true 
        }, { transaction });
      }
      
      // Commit the transaction
      await transaction.commit();
      
      console.log('✅ Test data imported successfully!');
      console.log(`- ${testData.length} tests imported`);
      
      return {
        success: true,
        message: 'Test data imported successfully',
        count: testData.length
      };
      
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error('❌ Error importing test data:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

// Function to import only tests (backward compatibility)
async function importTests() {
  try {
    return await runInTenantContext(async () => {
      return await importTestsToTenant();
    });
  } catch (error) {
    console.error('❌ Error in standalone test import:', error);
    throw error;
  }
}

// Export all data and functions
module.exports = { 
  testData, 
  departmentData, 
  categoryData, 
  groupData,
  importHierarchicalData,
  importHierarchicalDataToTenant,
  importTests,
  importTestsToTenant
};

// Run the import function only if this script is executed directly
if (require.main === module) {
  // Import hierarchical data by default
  console.log('🚀 Starting direct execution of test data import...');
  importHierarchicalData()
    .then((result) => {
      console.log('✅ Direct execution completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Direct execution failed:', error);
      process.exit(1);
    });
}