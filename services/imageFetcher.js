/*
 * =====================================================
 * AI IMAGE FETCHER SERVICE (ENHANCED)
 * =====================================================
 *
 * Automatic product name & category matching using curated high-res
 * Unsplash e-commerce product photos. Fast, reliable & zero API keys.
 */

// Curated high-quality product images by common keywords
const PRODUCT_KEYWORD_MAP = {
  // Apparel & Fashion
  kurta: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80",
  kurti: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80",
  shirt: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
  tshirt: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
  "t-shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
  pant: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80",
  jeans: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80",
  dress: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80",
  saree: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80",
  suit: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80",
  shoe: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
  shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
  sneaker: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
  jacket: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80",
  wearable: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
  apparel: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80",
  cloth: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80",
  clothing: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80",

  // Electronics & Gadgets
  laptop: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
  computer: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
  mobile: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
  phone: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
  smartphone: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
  smartwatch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
  headphone: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
  earbuds: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
  electronic: "https://images.unsplash.com/photo-1498049860654-af1a5c566876?w=600&auto=format&fit=crop&q=80",
  electronics: "https://images.unsplash.com/photo-1498049860654-af1a5c566876?w=600&auto=format&fit=crop&q=80",

  // Stationery & Bags
  pen: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
  notebook: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&auto=format&fit=crop&q=80",
  stationery: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
  bag: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
  backpack: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
  wallet: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
  accessory: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
  accessories: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",

  // Coffee & Tea
  coffee: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80",
  tea: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",
  chai: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",

  // Dairy & Icecream
  milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
  paneer: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=600&auto=format&fit=crop&q=80",
  cheese: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600&auto=format&fit=crop&q=80",
  butter: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80",
  curd: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80",
  dahi: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80",
  icecream: "https://images.unsplash.com/photo-1560008511-11c63416e52d?w=600&auto=format&fit=crop&q=80",
  "ice cream": "https://images.unsplash.com/photo-1560008511-11c63416e52d?w=600&auto=format&fit=crop&q=80",
  amul: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",

  // Snacks & Drinks
  kurkure: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
  chips: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
  snack: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
  cocacola: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
  coca: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
  cola: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
  pepsi: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
  drink: "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=600&auto=format&fit=crop&q=80",
  juice: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
  bottle: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
  water: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",

  // Fruits & Vegetables
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
  mango: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80",
  orange: "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&auto=format&fit=crop&q=80",
  fruit: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80",
  vegetable: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80",
  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",

  // Bakery & Staples
  bread: "https://images.unsplash.com/photo-1585478259715-876a6a81fa08?w=600&auto=format&fit=crop&q=80",
  bun: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80",
  cake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
  biscuit: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80",
  cookie: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80",
  atta: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
  dal: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
  oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
  honey: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
  groceries: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
};

// Fallback category placeholders
const CATEGORY_PLACEHOLDERS = {
  groceries: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
  dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
  "dairy & bakery": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
  bakery: "https://images.unsplash.com/photo-1585478259715-876a6a81fa08?w=600&auto=format&fit=crop&q=80",
  fruit: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80",
  "fruits & vegetables": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80",
  snacks: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&auto=format&fit=crop&q=80",
  "snacks & drinks": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&auto=format&fit=crop&q=80",
  drinks: "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=600&auto=format&fit=crop&q=80",
  "beauty & personal care": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=80",
  fashion: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80",
  apparel: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80",
  clothing: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80",
  electronics: "https://images.unsplash.com/photo-1498049860654-af1a5c566876?w=600&auto=format&fit=crop&q=80",
  stationery: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
  accessories: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
};

/**
 * fetchImageForProduct - Searches for a matching product image
 */
async function fetchImageForProduct(productName, category = "default") {
  if (!productName || typeof productName !== "string") {
    return getFallbackImage(category);
  }

  const cleanName = productName.toLowerCase().trim();

  // 1. Check direct keyword map
  for (const [key, imgUrl] of Object.entries(PRODUCT_KEYWORD_MAP)) {
    if (cleanName.includes(key)) {
      console.log(`✅ AI Image Fetcher matched keyword "${key}" for "${productName}" -> ${imgUrl}`);
      return imgUrl;
    }
  }

  // 2. Return category fallback if keyword not matched
  return getFallbackImage(category);
}

/**
 * getFallbackImage - Returns a relevant fallback placeholder
 */
function getFallbackImage(category = "default") {
  const catKey = (category || "").toLowerCase().trim();
  return CATEGORY_PLACEHOLDERS[catKey] || CATEGORY_PLACEHOLDERS.default;
}

module.exports = {
  fetchImageForProduct,
  getFallbackImage,
};
