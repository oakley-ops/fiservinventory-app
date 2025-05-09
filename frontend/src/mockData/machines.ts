import { Machine } from '../types';

const mockMachines: Machine[] = [
  {
    id: 1,
    name: "GAS-101",
    model: "V6B36",
    serial_number: "VN2023451",
    location: "Main Kitchen - Cooking Line",
    manufacturer: "Vulcan",
    installation_date: "2025-03-15",
    last_maintenance_date: "2025-03-25",
    next_maintenance_date: "2025-06-25",
    notes: "Commercial 6-Burner Gas Range - Minor issues with right burner ignition",
    status: "active"
  },
  {
    id: 2,
    name: "COOL-102",
    model: "QC081272",
    serial_number: "AM20250089",
    location: "Rear Kitchen Area",
    manufacturer: "Amerikooler",
    installation_date: "2025-03-28",
    last_maintenance_date: "2025-04-10",
    next_maintenance_date: "2025-07-10",
    notes: "Walk-in Cooler 8' x 12' x 7'2\" - Requires quarterly temperature calibration",
    status: "active"
  },
  {
    id: 3,
    name: "OVEN-103",
    model: "3240-000-R",
    serial_number: "LP10289345",
    location: "Pizza Station",
    manufacturer: "Lincoln",
    installation_date: "2025-04-05",
    last_maintenance_date: "2025-04-15",
    next_maintenance_date: "2025-07-15",
    notes: "Conveyor Pizza Oven - Keep conveyor belt clean to prevent food debris build-up",
    status: "active"
  },
  {
    id: 4,
    name: "DISH-104",
    model: "AM15T-BAS",
    serial_number: "HB2025673",
    location: "Dish Room",
    manufacturer: "Hobart",
    installation_date: "2025-04-12",
    last_maintenance_date: "2025-04-20",
    next_maintenance_date: "2025-07-20",
    notes: "Commercial Dishwasher - Replace rinse-aid dispenser in July",
    status: "active"
  },
  {
    id: 5,
    name: "OVEN-105",
    model: "iCombi Pro 20-2/1",
    serial_number: "RCB2025129",
    location: "Banquet Kitchen",
    manufacturer: "Rational",
    installation_date: "2025-04-18",
    last_maintenance_date: "2025-04-25",
    next_maintenance_date: "2025-07-25",
    notes: "Double Stack Combi Oven - Requires water filtration system maintenance",
    status: "active"
  },
  {
    id: 6,
    name: "FREEZ-106",
    model: "QF101410",
    serial_number: "AM20250103",
    location: "Banquet Kitchen Storage Area",
    manufacturer: "Amerikooler",
    installation_date: "2025-04-22",
    last_maintenance_date: "2025-05-01",
    next_maintenance_date: "2025-08-01",
    notes: "Walk-in Freezer 10' x 14' x 7'6\" - Check door seals monthly",
    status: "active"
  },
  {
    id: 7,
    name: "GRILL-107",
    model: "MG-36",
    serial_number: "VLG2025112",
    location: "Main Kitchen - Grill Line",
    manufacturer: "Vulcan",
    installation_date: "2025-04-08",
    last_maintenance_date: "2025-04-18",
    next_maintenance_date: "2025-07-18",
    notes: "36-inch Flat Top Griddle - Clean thoroughly after each service",
    status: "active"
  },
  {
    id: 8,
    name: "MIXER-108",
    model: "HL800",
    serial_number: "HBM2025224",
    location: "Bakery Zone",
    manufacturer: "Hobart",
    installation_date: "2025-04-15",
    last_maintenance_date: "2025-04-30",
    next_maintenance_date: "2025-07-30",
    notes: "80 Qt Floor Mixer - Check gear oil every 3 months",
    status: "maintenance_due"
  },
  {
    id: 9,
    name: "FRYER-109",
    model: "1VEG35",
    serial_number: "FRY2025098",
    location: "Fry Station",
    manufacturer: "Frymaster",
    installation_date: "2025-03-25",
    last_maintenance_date: "2025-04-05",
    next_maintenance_date: "2025-07-05",
    notes: "35 lb High-Efficiency Fryer - Clean oil filter daily",
    status: "active"
  },
  {
    id: 10,
    name: "ICE-110",
    model: "ID-0502A",
    serial_number: "MN2025335",
    location: "Bar Area",
    manufacturer: "Manitowoc",
    installation_date: "2025-03-30",
    last_maintenance_date: "2025-04-10",
    next_maintenance_date: "2025-05-10",
    notes: "500 lb Ice Machine - Clean condenser monthly",
    status: "maintenance_overdue"
  },
  {
    id: 11,
    name: "SERVE-111",
    model: "TEHF-88",
    serial_number: "DM2025087",
    location: "Cafeteria Service Area",
    manufacturer: "Duke Manufacturing",
    installation_date: "2025-06-25",
    last_maintenance_date: null,
    next_maintenance_date: "2025-09-25",
    notes: "Hot Food Serving Counter with 8 wells - Install pending",
    status: "pending"
  },
  {
    id: 12,
    name: "KETTLE-112",
    model: "KGL-40T",
    serial_number: "CL2025342",
    location: "Hospital Kitchen - Cooking Area",
    manufacturer: "Cleveland",
    installation_date: "2025-05-20",
    last_maintenance_date: null,
    next_maintenance_date: "2025-08-20",
    notes: "40-gallon Gas Tilting Kettle - Installation scheduled",
    status: "pending"
  },
  {
    id: 13,
    name: "REFRIG-113",
    model: "T-49-HC",
    serial_number: "TRUE2025187",
    location: "Prep Station",
    manufacturer: "True",
    installation_date: "2025-04-02",
    last_maintenance_date: "2025-04-12",
    next_maintenance_date: "2025-05-12",
    notes: "Reach-in Refrigerator - Clean coils every 6 weeks",
    status: "maintenance_overdue"
  },
  {
    id: 14,
    name: "SLICER-114",
    model: "HS6N-1",
    serial_number: "HBL2025119",
    location: "Deli Station",
    manufacturer: "Hobart",
    installation_date: "2025-04-10",
    last_maintenance_date: "2025-04-20",
    next_maintenance_date: "2025-05-20",
    notes: "Automatic Meat Slicer - Sharpen blade monthly",
    status: "maintenance_overdue"
  },
  {
    id: 15,
    name: "WARM-115",
    model: "FDWD-1",
    serial_number: "HT2025067",
    location: "Expo Line",
    manufacturer: "Hatco",
    installation_date: "2025-04-08",
    last_maintenance_date: "2025-04-15",
    next_maintenance_date: "2025-07-15",
    notes: "Food Warming Drawer - Clean humidity reservoir weekly",
    status: "active"
  }
];

export default mockMachines; 