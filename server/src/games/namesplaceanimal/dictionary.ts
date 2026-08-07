import type { NamePlaceAnimalCategory } from "@shared/types.js";

/** Built-in dataset for Name Place Animal Thing validation and bot auto-picks. */
export const DICTIONARY: Record<
  string,
  Record<NamePlaceAnimalCategory, string[]>
> = {
  A: {
    name: ["Arjun", "Anil", "Alice", "Adam", "Amrita", "Anita", "Aaron", "Alexander", "Amanda", "Aravind"],
    place: ["Amsterdam", "Athens", "Austin", "Agra", "Ahmedabad", "Argentina", "Australia", "Austria", "Algeria", "Atlanta"],
    animal: ["Alligator", "Anteater", "Ant", "Anaconda", "Albatross", "Alpaca", "Ape", "Armadillo", "Antelope", "Axolotl"],
    thing: ["Apple", "Anchor", "Arrow", "Airplane", "Album", "Alarm", "Ambulance", "Apron", "Axe", "Accordion"],
  },
  B: {
    name: ["Bhavana", "Balaji", "Ben", "Brian", "Barbara", "Bharath", "Bhavani", "Bella", "Bruce", "Brenden"],
    place: ["Bengaluru", "Berlin", "Boston", "Beijing", "Bangkok", "Brazil", "Belgium", "Baltimore", "Bhopal", "Budapest"],
    animal: ["Bear", "Bat", "Buffalo", "Beaver", "Bee", "Baboon", "Badger", "Boar", "Bumblebee", "Bull"],
    thing: ["Ball", "Book", "Bottle", "Box", "Bicycle", "Bell", "Bag", "Button", "Brush", "Bucket"],
  },
  C: {
    name: ["Charan", "Cynthia", "Chris", "Charles", "Clara", "Chaitanya", "Chloe", "Chetan", "Colin", "Catherine"],
    place: ["Chennai", "Chicago", "Cairo", "Canada", "Canberra", "Colombia", "Copenhagen", "Calcutta", "Chiba", "Colombo"],
    animal: ["Cat", "Camel", "Cheetah", "Cougar", "Chimpanzee", "Crab", "Crocodile", "Crow", "Cobra", "Coyote"],
    thing: ["Car", "Camera", "Chair", "Clock", "Computer", "Cap", "Candle", "Coin", "Comb", "Cup"],
  },
  D: {
    name: ["Deepak", "David", "Divya", "Daniel", "Diana", "Dinesh", "Daisy", "Devi", "Donald", "Darren"],
    place: ["Delhi", "Dallas", "Dublin", "Detroit", "Dakar", "Denmark", "Dammam", "Doha", "Durban", "Dresden"],
    animal: ["Dog", "Donkey", "Deer", "Dolphin", "Duck", "Dragonfly", "Dingo", "Dove", "Dugong", "Dinosaur"],
    thing: ["Door", "Drum", "Desk", "Dice", "Diamond", "Doll", "Dart", "Dish", "Drawer", "Drill"],
  },
  E: {
    name: ["Eswar", "Emily", "Eric", "Elizabeth", "Ethan", "Elena", "Edward", "Evelyn", "Emanuel", "Emma"],
    place: ["Edinburgh", "Egypt", "Ecuador", "Ethiopia", "Estonia", "El Paso", "Eindhoven", "Essen", "Eugene", "Entebbe"],
    animal: ["Elephant", "Eagle", "Eel", "Emu", "Elk", "Earthworm", "Echidna", "Egret", "Emperor Penguin", "Ermine"],
    thing: ["Envelope", "Eraser", "Engine", "Earring", "Easel", "Egg", "Elbow Pad", "Exhaust", "Escalator", "Extension Cord"],
  },
  F: {
    name: ["Farhan", "Felix", "Fiona", "Francis", "Fatima", "Frank", "Freya", "Faizan", "Finn", "Florence"],
    place: ["France", "Frankfurt", "Fiji", "Finland", "Florence", "Florida", "Fukushima", "Freiburg", "Fargo", "Fuzhou"],
    animal: ["Fox", "Frog", "Flamingo", "Falcon", "Ferret", "Firefly", "Flounder", "Flea", "Fossa", "Fish"],
    thing: ["Fan", "Fork", "Feather", "Frame", "Flute", "Flashlight", "Fence", "File", "Frying Pan", "Fountain"],
  },
  G: {
    name: ["Ganesh", "Gautam", "Grace", "George", "Geeta", "Gabriel", "Gita", "Gavin", "Gwen", "Gideon"],
    place: ["Germany", "Geneva", "Greece", "Georgia", "Guangzhou", "Glasgow", "Guatemala", "Goa", "Guntur", "Gwalior"],
    animal: ["Giraffe", "Gorilla", "Goat", "Goose", "Gazelle", "Goldfish", "Grasshopper", "Gull", "Gopher", "Gecko"],
    thing: ["Glass", "Guitar", "Glove", "Gate", "Gun", "Goggles", "Garland", "Grid", "Gear", "Generator"],
  },
  H: {
    name: ["Harish", "Hemant", "Hannah", "Harry", "Helen", "Harini", "Howard", "Heather", "Hemanth", "Harrison"],
    place: ["Hyderabad", "Houston", "Hanoi", "Helsinki", "Hamburg", "Hungary", "Harare", "Honolulu", "Havana", "Hobart"],
    animal: ["Horse", "Hippo", "Hyena", "Hawk", "Hedgehog", "Hamster", "Heron", "Hummingbird", "Hornet", "Hare"],
    thing: ["Hat", "Hammer", "Helmet", "Helicopter", "House", "Hook", "Hose", "Horn", "Heater", "Harp"],
  },
  I: {
    name: ["Ishaan", "Indira", "Ian", "Irene", "Imran", "Isabella", "Ibrahim", "Ivan", "Ilango", "Ivy"],
    place: ["India", "Indonesia", "Italy", "Ireland", "Iceland", "Istanbul", "Incheon", "Indianapolis", "Ithaca", "Ipswich"],
    animal: ["Iguana", "Impala", "Ibex", "Ibis", "Insect", "Indri", "Isopod", "Ivory-billed Woodpecker", "Ichneumon", "Inland Taipan"],
    thing: ["Ink", "Iron", "Ice", "Instrument", "Insulation", "Idol", "Igniter", "Ivory", "Incense", "Infrared Sensor"],
  },
  J: {
    name: ["Janaki", "Joseph", "John", "Jessica", "Jack", "Jayant", "Julia", "Jason", "Jasmine", "Jacob"],
    place: ["Jaipur", "Jakarta", "Japan", "Johannesburg", "Jeddah", "Jerusalem", "Jamaica", "Jordan", "Juneau", "Jodhpur"],
    animal: ["Jaguar", "Jellyfish", "Jackal", "Jay", "Jerboa", "Jackrabbit", "Javelin", "Japanese Macaque", "Javan Rhino", "Junco"],
    thing: ["Jacket", "Jar", "Jeep", "Jewel", "Jug", "Joystick", "Journal", "Jigsaw", "Jumper", "Jukebox"],
  },
  K: {
    name: ["Kiran", "Kavya", "Karthik", "Kevin", "Karen", "Kumar", "Krish", "Kathleen", "Kenneth", "Kalyan"],
    place: ["Kochi", "Kolkata", "Kyoto", "Kiev", "Kenya", "Kingston", "Karachi", "Kathmandu", "Kuala Lumpur", "Kigali"],
    animal: ["Kangaroo", "Koala", "Kingfisher", "Kiwi", "Killer Whale", "Kitten", "Komodo Dragon", "Kestrel", "Krill", "Kudu"],
    thing: ["Key", "Kettle", "Kite", "Knife", "Keyboard", "Keg", "Kerosine Lamp", "Kiln", "Knob", "Kimono"],
  },
  L: {
    name: ["Lakshmi", "Lokesh", "Luke", "Laura", "Leo", "Lalitha", "Liam", "Logan", "Lisa", "Lucy"],
    place: ["London", "Los Angeles", "Lisbon", "Lima", "Lyon", "Lagos", "Lebanon", "Luxembourg", "Leipzig", "Lucknow"],
    animal: ["Lion", "Leopard", "Llama", "Lemur", "Lizard", "Lynx", "Lobster", "Leech", "Locust", "Loon"],
    thing: ["Lamp", "Lock", "Ladder", "Laptop", "Leaf", "Leash", "Lighter", "Locket", "Log", "Loudspeaker"],
  },
  M: {
    name: ["Mahesh", "Meena", "Manish", "Michael", "Mary", "Manohar", "Michelle", "Matthew", "Madhav", "Maya"],
    place: ["Mumbai", "Madrid", "Melbourne", "Mexico", "Manila", "Montreal", "Moscow", "Milan", "Munich", "Madurai"],
    animal: ["Monkey", "Mouse", "Moose", "Mole", "Mongoose", "Moth", "Mosquito", "Manta Ray", "Meerkat", "Mule"],
    thing: ["Magnet", "Mirror", "Map", "Microphone", "Mask", "Matches", "Mat", "Mug", "Marble", "Motorcycle"],
  },
  N: {
    name: ["Naveen", "Nisha", "Nicholas", "Nicole", "Narendra", "Nathan", "Nandini", "Noah", "Naresh", "Natalie"],
    place: ["New York", "Nairobi", "New Delhi", "Norway", "Nigeria", "Naples", "Nice", "Nagpur", "Nashville", "Nantes"],
    animal: ["Newt", "Nightingale", "Narwhal", "Numbat", "Nudibranch", "Nutria", "Nilgai", "Nautilus", "Needlefish", "Nene"],
    thing: ["Needle", "Net", "Notebook", "Nail", "Necklace", "Nut", "Napkin", "Newspaper", "Nozzle", "Nightstand"],
  },
  O: {
    name: ["Omkar", "Oliver", "Olivia", "Oscar", "Owen", "Ophelia", "Onkar", "Omar", "Odessa", "Orson"],
    place: ["Oslo", "Ottawa", "Oxford", "Oman", "Osaka", "Orlando", "Ostrava", "Orenburg", "Oaxaca", "Ouro Preto"],
    animal: ["Owl", "Octopus", "Ostrich", "Otter", "Orangutan", "Ocelot", "Opossum", "Oryx", "Oyster", "Orca"],
    thing: ["Oven", "Oil", "Organ", "Orb", "Oar", "Ornament", "Oatmeal", "Odometer", "Outsole", "Outlet"],
  },
  P: {
    name: ["Pavan", "Pooja", "Pradeep", "Peter", "Paul", "Priya", "Patrick", "Prashanth", "Penelope", "Philip"],
    place: ["Paris", "Prague", "Perth", "Beijing", "Peru", "Poland", "Portland", "Phoenix", "Pune", "Patna"],
    animal: ["Penguin", "Panda", "Panther", "Parrot", "Pig", "Peacock", "Puma", "Porcupine", "Pelican", "Python"],
    thing: ["Pen", "Pencil", "Phone", "Paper", "Plate", "Pillow", "Pin", "Pot", "Purse", "Piano"],
  },
  R: {
    name: ["Rahul", "Ramesh", "Rachel", "Robert", "Ramya", "Richard", "Rohit", "Rebecca", "Rajesh", "Ryan"],
    place: ["Rome", "Rio de Janeiro", "Riyadh", "Rotterdam", "Romania", "Ranchi", "Reykjavik", "Raleigh", "Rabat", "Riga"],
    animal: ["Rabbit", "Rat", "Rhino", "Raven", "Reindeer", "Raccoon", "Rattlesnake", "Rooster", "Robin", "Ram"],
    thing: ["Ring", "Radio", "Rope", "Ruler", "Rocket", "Rug", "Razor", "Ribbon", "Robot", "Racket"],
  },
  S: {
    name: ["Suresh", "Sneha", "Srikanth", "Sarah", "Samuel", "Sunita", "Stephen", "Swati", "Simon", "Sophia"],
    place: ["Singapore", "Sydney", "Seoul", "Spain", "Stockholm", "San Francisco", "Seattle", "Surat", "Shimla", "Srinagar"],
    animal: ["Snake", "Shark", "Sheep", "Squirrel", "Spider", "Swan", "Seal", "Skunk", "Sloth", "Scorpion"],
    thing: ["Spoon", "Soap", "Shoe", "Shirt", "Scissors", "Stamp", "Sword", "Speaker", "Spectacles", "Sponge"],
  },
  T: {
    name: ["Tarun", "Teja", "Thomas", "Tanya", "Timothy", "Trisha", "Tyler", "Trinadh", "Teresa", "Theodore"],
    place: ["Tokyo", "Toronto", "Thiruvananthapuram", "Thailand", "Turkey", "Tunis", "Tashkent", "Tampa", "Toulouse", "Tirupati"],
    animal: ["Tiger", "Turtle", "Toucan", "Tarantula", "Turkey", "Termite", "Tapir", "Trout", "Tuna", "Toad"],
    thing: ["Table", "Telephone", "Television", "Towel", "Torch", "Train", "Tire", "Toothbrush", "Tent", "Trombone"],
  },
  U: {
    name: ["Uday", "Uma", "Umesh", "Usha", "Ursula", "Ulysses", "Umberto", "Upendra", "Udaya", "Uriah"],
    place: ["Uganda", "Ukraine", "Udaipur", "Ulaanbaatar", "Utrecht", "Ushuaia", "Ulsan", "Ufa", "Urbana", "Udupi"],
    animal: ["Unicorn", "Umbrellabird", "Urial", "Urchin", "Uguisu", "Uakari", "Utonagan", "Uinta Ground Squirrel", "Underwing Moth", "Upupa"],
    thing: ["Umbrella", "Uniform", "Urn", "Utensil", "USB Flash Drive", "Unicycle", "Underwear", "Upgrade Module", "Ultrasound", "U-Bolt"],
  },
  V: {
    name: ["Vijay", "Varun", "Vikram", "Victoria", "Vincent", "Vidya", "Vanessa", "Vishnu", "Victor", "Venkatesh"],
    place: ["Vienna", "Vancouver", "Venice", "Vietnam", "Valencia", "Verona", "Varanasi", "Vijayawada", "Vientiane", "Vilnius"],
    animal: ["Vulture", "Viper", "Vole", "Vicuña", "Vervet Monkey", "Vampire Bat", "Vine Snake", "Vanga", "Veiled Chameleon", "Vaquita"],
    thing: ["Vase", "Violin", "Van", "Valve", "Vest", "Video Camera", "Vinegar Bottle", "Visor", "Vellum", "Voltmeter"],
  },
  W: {
    name: ["William", "Wayne", "Wendy", "Walter", "Wilma", "Winston", "Wesley", "Wanda", "Wyatt", "Whitney"],
    place: ["Washington", "Warsaw", "Wellington", "Wuhan", "Windhoek", "Winnipeg", "Warangal", "Wollongong", "Worcester", "Wroclaw"],
    animal: ["Wolf", "Whale", "Walrus", "Wasp", "Weasel", "Wombat", "Worm", "Woodpecker", "Wolverine", "Wildebeest"],
    thing: ["Watch", "Whistle", "Wheel", "Window", "Wire", "Wrench", "Wallet", "Whip", "Water Bottle", "Wooden Box"],
  },
  Y: {
    name: ["Yash", "Yogesh", "Yvonne", "Yusuf", "Yasmin", "Yashoda", "Yannick", "Yazmin", "Yousef", "Yitzhak"],
    place: ["Yokohama", "Yerevan", "Yangon", "Yemen", "Yellowknife", "Yekaterinburg", "York", "Yamunanagar", "Yalta", "Yogyakarta"],
    animal: ["Yak", "Yellowjacket", "Yeti Crab", "Yellow mongoose", "Yabby", "Yellow baboon", "Yoruba Goat", "Yellowhead Jawfish", "Yuhina", "Yarara"],
    thing: ["Yarn", "Yacht", "Yoyo", "Yoke", "Yeast Jar", "Yield Sign", "Yucca Pot", "Yellow Flag", "Yew Bow", "Yule Log"],
  },
};

/** Validate if a given word starts with the letter and matches dictionary or common patterns. */
export function validateAnswer(
  category: NamePlaceAnimalCategory,
  letter: string,
  word: string,
): boolean {
  const trimmed = word.trim();
  if (!trimmed) return false;
  if (trimmed[0].toUpperCase() !== letter.toUpperCase()) return false;
  if (trimmed.length < 2) return false;

  const targetLetter = letter.toUpperCase();
  const dictCategory = DICTIONARY[targetLetter]?.[category];

  if (dictCategory) {
    const isMatch = dictCategory.some(
      (entry) => entry.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isMatch) return true;
  }

  return /^[A-Za-z\s'-]{2,30}$/.test(trimmed);
}

/** Get a random valid suggestion for bot auto-moves. */
export function getBotAnswer(
  category: NamePlaceAnimalCategory,
  letter: string,
): string {
  const targetLetter = letter.toUpperCase();
  const list = DICTIONARY[targetLetter]?.[category];
  if (list && list.length > 0) {
    return list[Math.floor(Math.random() * list.length)];
  }
  return `${targetLetter}${category}`;
}

/** Get helpful clue hints for a given letter across all 4 categories. */
export function getCategoryClues(letter: string): Record<NamePlaceAnimalCategory, string> {
  const target = letter.toUpperCase();
  const entry = DICTIONARY[target];
  return {
    name: entry?.name ? `e.g. ${entry.name.slice(0, 3).join(", ")}...` : `Famous name starting with ${target}`,
    place: entry?.place ? `e.g. ${entry.place.slice(0, 3).join(", ")}...` : `City or country starting with ${target}`,
    animal: entry?.animal ? `e.g. ${entry.animal.slice(0, 3).join(", ")}...` : `Wild/pet creature starting with ${target}`,
    thing: entry?.thing ? `e.g. ${entry.thing.slice(0, 3).join(", ")}...` : `Everyday object starting with ${target}`,
  };
}
