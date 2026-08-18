// Editorial news fallback imagery pool (verified high-res Unsplash photos)
// Ensures that NO article card or modal ever displays a blank placeholder.

const TOPIC_IMAGES = {
  cricket: [
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
  ],
  football: [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80",
  ],
  sports: [
    "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80",
  ],
  weather: [
    "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80",
  ],
  technology: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
  ],
  business: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
  ],
  health: [
    "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
  ],
  science: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517976487570-58479a0eb523?auto=format&fit=crop&w=800&q=80",
  ],
  politics: [
    "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80",
  ],
  general: [
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=800&q=80",
  ],
};

export function getEditorialFallback(title = "", category = "general", index = 0) {
  const t = (title || "").toLowerCase();

  let pool = TOPIC_IMAGES.general;

  if (t.includes("cricket") || t.includes("babar") || t.includes("ipl") || t.includes("psl")) {
    pool = TOPIC_IMAGES.cricket;
  } else if (t.includes("football") || t.includes("fifa") || t.includes("soccer") || t.includes("messi") || t.includes("ronaldo")) {
    pool = TOPIC_IMAGES.football;
  } else if (t.includes("sport") || t.includes("match") || t.includes("hockey") || t.includes("olympic")) {
    pool = TOPIC_IMAGES.sports;
  } else if (t.includes("rain") || t.includes("flood") || t.includes("weather") || t.includes("monsoon") || t.includes("storm")) {
    pool = TOPIC_IMAGES.weather;
  } else if (t.includes("ai") || t.includes("tech") || t.includes("apple") || t.includes("google") || t.includes("microsoft") || t.includes("software") || t.includes("chip")) {
    pool = TOPIC_IMAGES.technology;
  } else if (t.includes("stock") || t.includes("market") || t.includes("bank") || t.includes("dollar") || t.includes("rupee") || t.includes("economy") || t.includes("inflation") || t.includes("trade") || t.includes("gold") || t.includes("futures")) {
    pool = TOPIC_IMAGES.business;
  } else if (t.includes("movie") || t.includes("music") || t.includes("song") || t.includes("film") || t.includes("drama") || t.includes("actor") || t.includes("hollywood") || t.includes("lollywood") || t.includes("bollywood")) {
    pool = TOPIC_IMAGES.entertainment;
  } else if (t.includes("health") || t.includes("doctor") || t.includes("hospital") || t.includes("virus") || t.includes("disease") || t.includes("medical")) {
    pool = TOPIC_IMAGES.health;
  } else if (t.includes("space") || t.includes("nasa") || t.includes("moon") || t.includes("mars") || t.includes("planet") || t.includes("science")) {
    pool = TOPIC_IMAGES.science;
  } else if (t.includes("trump") || t.includes("biden") || t.includes("minister") || t.includes("government") || t.includes("parliament") || t.includes("senate") || t.includes("imran") || t.includes("shehbaz") || t.includes("pmln") || t.includes("pti") || t.includes("ppp")) {
    pool = TOPIC_IMAGES.politics;
  } else if (TOPIC_IMAGES[category]) {
    pool = TOPIC_IMAGES[category];
  }

  // Pick deterministically based on title characters / index so it remains consistent
  let hash = index;
  for (let i = 0; i < t.length; i++) {
    hash = (hash + t.charCodeAt(i)) % pool.length;
  }

  return pool[hash % pool.length];
}
