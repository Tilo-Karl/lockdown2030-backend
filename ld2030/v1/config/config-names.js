// ld2030/v1/config/config-names.js
// Deterministic naming pools for city / districts / buildings.
// Keep lists short-ish and reusable; the generator mixes them.

const NAMES = {
  // 20-ish “place” names that can work for both cities and districts
  PLACE: [
    'Somerville', 'Ashford', 'Westgate', 'Kingsbridge', 'Riverside',
    'Stonehaven', 'Lakeshore', 'Ironwood', 'Briarwood', 'Fairview',
    'Brookfield', 'Northpoint', 'Southridge', 'Eastvale', 'Oldtown',
    'Newhaven', 'Redmont', 'Highmoor', 'Glenwood', 'Harborview',
    'Sundale', 'Blackwell', 'Maplehurst', 'Cedarcrest',
  ],

  // 20-ish people names for “Dick’s Sporting Shop” style
  PEOPLE: [
    'Dick', 'Mason', 'Harper', 'Reed', 'Parker',
    'Carter', 'Hughes', 'Morgan', 'Hayes', 'Bishop',
    'Foster', 'Sullivan', 'Bennett', 'Cooper', 'Wright',
    'Ramirez', 'Nakamura', 'Johansson', 'Khan', 'Petrov',
    'Delgado', 'Nguyen', 'Ibrahim', 'Nowak',
  ],

  // Words to make districts feel real
DISTRICT_SUFFIX: [
  'District', 'Ward', 'Heights', 'Old Quarter', 'West', 'East', 'North', 'South',
  'Industrial Zone', 'Uptown', 'Downtown',
],

  // “Shop” synonyms / styles
  SHOP_WORD: [
    'Shop', 'Store', 'Goods', 'Supply', 'Outfitters', 'Market', 'Mart', 'Trading Post',
  ],

  COMPANY_WORD: [
    'Co.', 'Company', '& Sons', 'Group', 'Holdings', 'Logistics',
  ],

  // Optional flavor connectors
  CONNECTOR: ['of', 'at', 'in', 'from'],

  // Building-type friendly nouns (so a SHOP isn’t always “Shop”)
  TYPE_LABEL: {
    HOUSE: 'House',
    APARTMENT: 'Apartments',
    SHOP: 'Shop',
    RESTAURANT: 'Restaurant',
    OFFICE: 'Offices',
    WAREHOUSE: 'Warehouse',
    PARKING: 'Parking',
    SCHOOL: 'School',
    HOSPITAL: 'Hospital',
    CLINIC: 'Clinic',
    PHARMACY: 'Pharmacy',
    POLICE: 'Police Station',
    FIRE_STATION: 'Fire Station',
    GAS_STATION: 'Gas Station',
    SAFEHOUSE: 'Safehouse',
    OUTPOST: 'Outpost',
    BUNKER: 'Bunker',
    HQ: 'HQ',
    RADIO_STATION: 'Radio Station',
    LABORATORY: 'Laboratory',
    TRANSFORMER_SUBSTATION: 'Transformer Substation',
  },
};

module.exports = { NAMES };