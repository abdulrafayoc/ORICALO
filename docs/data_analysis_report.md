# State of the Data: Comprehensive Analysis of Public Datasets for PropTech in Pakistan (RAG & AVM Architectures)

## 1. Executive Summary
The digitization of Pakistan’s real estate sector has reached a critical inflection point. As the market transitions from informal, paper-based "file" trading to digital platforms, a substantial volume of data has emerged, offering unprecedented opportunities for computational analysis. For data scientists, engineers, and financial analysts, this data landscape presents two distinct frontiers: the development of Retrieval-Augmented Generation (RAG) systems capable of semantic search and multimodal interaction, and the construction of Automated Valuation Models (AVMs) for precise price forecasting.

This report serves as a definitive technical audit of the current open-source data ecosystem for Pakistani real estate. It evaluates the suitability of publicly available datasets for these downstream tasks, adhering to strict criteria regarding metadata richness, temporal coverage, and licensing permissibility.

The analysis reveals that while the ecosystem is fragmented, it is rich in potential. We have identified a primary cluster of high-value datasets sourced largely from web-scraping efforts targeting major portals such as Zameen.com and Graana.com. These datasets, particularly those spanning the 2019–2025 period, offer sufficient granularity—including amenities, location hierarchies, and textual descriptions—to support robust RAG pipelines. However, for price prediction, a significant "data gap" exists regarding transaction verification; the available data represents asking prices rather than sold prices. To mitigate this and other macroeconomic volatilities (such as the devaluation of the Pakistani Rupee), this report proposes a rigorous augmentation strategy, integrating property listings with longitudinal macroeconomic indicators from the World Bank and the State Bank of Pakistan.

The following sections provide an exhaustive deconstruction of these datasets, their schema properties, their latent defects, and the specific engineering pipelines required to transform raw scraped logs into production-grade intelligence assets.

## 2. The Strategic Data Landscape of Pakistani Real Estate
To understand the utility of the identified datasets, one must first contextualize the unique idiosyncrasies of the Pakistani property market. Unlike developed markets where Multiple Listing Services (MLS) provide standardized, verified feeds, the Pakistani digital landscape is dominated by user-generated listings on classified portals.

### 2.1 The "Asking Price" vs. "Transaction Price" Divergence
The most pervasive characteristic of the datasets analyzed in this report—sourced primarily from Zameen.com [1]—is that they reflect aspirational pricing. In Pakistan, the listing price typically includes a negotiation margin that can range from 5% to 20% depending on the urgency of the seller and the "heat" of the specific locality (e.g., DHA Lahore vs. a developing sector in Islamabad).

**Implication for Modeling:** Predictive models trained on this data will inherently predict listing prices. To serve as true valuation models, they require correction factors. The report identifies datasets with "Short Description" and "Long Description" fields [4] where agents often embed text signals like "urgent sale" or "demand final," which can be extracted via Natural Language Processing (NLP) to adjust predicted values closer to market reality.

### 2.2 The Challenge of Unit Heterogeneity
A significant engineering hurdle identified across almost all candidate datasets is the non-standardization of area units. The "Marla," a traditional unit of measurement, is not a constant.

**The Variance:** In the revenue records of Punjab, a Marla is typically 272.25 square feet. However, in private housing societies like DHA (Defense Housing Authority) and Bahria Town—which constitute the bulk of the high-value listings in datasets like [5] and [5]—a Marla is standardized to 225 square feet.

**Data Artifacts:** We observe datasets where the Area column mixes "5 Marla," "1 Kanal," and "500 Sq Yds" [6]. This necessitates a robust normalization pipeline. The report favors datasets that either include a pre-calculated `Area_sqft` column or provide distinct Location identifiers that allow for society-specific unit conversion rules.

### 2.3 The "File" System and Plot Dynamics
A unique feature of Pakistan's market is the trading of "files"—documents representing an entitlement to a plot in a future development that has not yet been balloted or possessed. Datasets that mix "Plot Files" with "Constructed Property" introduce massive variance in price-per-square-foot metrics.

**Segmentation Requirement:** High-quality datasets for RAG and Prediction must allow for the strict separation of Property Type. The analysis highlights datasets [8] that explicitly categorize entries into "House," "Flat," "Plot," and "Farm House," enabling the exclusion of speculative files from residential price models.

## 3. Dataset Deep Dive: Architectures for Retrieval-Augmented Generation (RAG)
Retrieval-Augmented Generation represents the next frontier in PropTech, moving beyond simple keyword search ("3 bed house Lahore") to semantic understanding ("I need a modern house in a quiet part of Lahore with a lawn and servant quarters, under 5 Crore").

For a dataset to be "RAG-Ready," it must transcend tabular metrics. It requires unstructured, high-dimensional data—rich textual descriptions, amenity lists, and visual pointers—that can be embedded into vector space. The following analysis evaluates candidate datasets against these strict semantic requirements.

### 3.1 Primary RAG Candidate: Explore Pakistan's Property Landscape
The dataset titled "Explore Pakistan's Property Landscape", sourced from Kaggle [3], emerges as the premier candidate for building RAG applications. Its suitability stems not just from its volume (~150,000 listings) but from its inclusion of specific columns that bridge the gap between structured data and unstructured context.

#### 3.1.1 Semantic Richness and Embeddings
The core of any RAG system is the quality of the text being embedded. This dataset provides a `title` column and a `url` column. While a dedicated "long description" column is sometimes truncated in preview snippets, the `url` serves as a gateway to the full semantic context.

**Title Analysis:** The titles in this dataset are not generic. They are agent-crafted hooks (e.g., "Brand New Single Storey House For Sale In Jinnah Garden Phase 1 Islamabad") [3]. These strings contain density regarding architectural style ("Single Storey"), condition ("Brand New"), and micro-location ("Phase 1"), which are invaluable for semantic retrieval.

**URL as a Data Source:** The dataset includes direct deep links to Zameen.com (e.g., `https://www.zameen.com/Property/islamabad_f-7_...`). For a production RAG pipeline, these URLs are critical. They allow the system to fetch the full property description page on-demand or during an initial ingestion crawl, capturing the nuanced agent narratives that describe interiors, neighborhood vibes, and investment potential—context that tabular data misses.

#### 3.1.2 Visual Context and Multimodality
A major limitation in many open datasets is the absence of image data. RAG is increasingly multimodal; users want to see what they are retrieving. This dataset stands out because it retains the `url` structure from which image assets can be derived.

**Integration Strategy:** By parsing the provided URLs, a pipeline can extract the `og:image` tags from the target pages. This enables the RAG system to return not just a text answer ("Here is a house in F-7") but a visual card, significantly enhancing user experience.

#### 3.1.3 Geospatial Filtering
The dataset excels in its spatial metadata, offering `Latitude`, `Longitude`, `City`, and `Address` [3].

**Geo-RAG Utility:** In a RAG workflow, a user might ask, "Find me houses near a park in Islamabad." A pure text search might fail here. However, by utilizing the lat/long coordinates, the retrieval system can perform a radius search against an external map database (like OpenStreetMap) to verify proximity to parks, filtering the semantic results through a geospatial sieve.

### 3.2 Secondary RAG Candidate: Pakistan Urban Real Estate Data
Sourced from OpenDataBay [4], the "Pakistan Urban Real Estate Data" dataset is a highly potent alternative, particularly for applications that require immediate textual density without additional scraping.

#### 3.2.1 Explicit Description Fields
Unlike other datasets that might require URL traversal to get the full text, this dataset explicitly contains `Short Desc` and `Long Desc` columns [4].

**The "Long Desc" Advantage:** This column is the "gold standard" for RAG. It typically contains the full marketing copy written by the estate agent. This text often includes information about flooring materials (marble, tile, wood), fixture brands (Grohe, Porta), and subjective qualities (sun-facing, corner plot) that are never captured in checkbox columns.

**Embedding Strategy:** Indexing the `Long Desc` column allows the LLM to answer highly specific questions such as, "Show me houses with Spanish-style architecture" or "Properties with imported kitchens," provided those keywords exist in the agent's copy.

#### 3.2.2 Natural Language Pricing
An unusual but valuable feature of this dataset is the `Price in words` column [4].

**Utility:** In Generative AI, dealing with large numbers (e.g., 55,000,000 PKR) can sometimes lead to hallucination or formatting errors in the output. Having a text representation ("5 Crore 50 Lakh") provides a ground-truth string that the LLM can directly output, ensuring the generated response sounds natural and localized to the Pakistani dialect of numbering.

### 3.3 Tertiary Candidate: Lahore House Listings (2025)
For applications specifically targeting the Punjab region—a requirement noted in the user query—the "Lahore House Listings from Zameen.com (2025)" dataset [9] is indispensable.

#### 3.3.1 Recent Temporal Relevance
Being scraped in mid-2025 [9], this dataset represents the most current snapshot of the market. Real estate is highly temporal; a description from 2019 might reference "new construction" that is now five years old. For RAG systems that promise up-to-date market intelligence, recency is a quality metric in itself.

#### 3.3.2 Detailed Amenities Schema
This dataset is distinguished by its granular boolean columns for amenities: `Kitchens`, `Store Rooms`, `Servant Quarters`, `Lawn/Garden`, `Swimming Pool`, `Electricity Backup` [9].

**RAG Synthesis:** While these are structured columns, they are vital for augmenting the text generation. If a user asks, "Tell me about the facilities," the RAG system can look at these booleans and synthesize a sentence: "This property includes a swimming pool, a dedicated store room, and electricity backup," even if the main description is sparse. The presence of Servant Quarters is a particularly strong proxy for luxury status in the Pakistani market, allowing for implicit filtering of high-end properties.

### 3.4 Missing Pieces in RAG Datasets & Augmentation Strategies
Despite the strengths of these datasets, they are not "plug-and-play" for a cutting-edge RAG system. Several critical components are missing and require augmentation.

#### 3.4.1 The Image Stability Problem
**Issue:** While datasets like [3] provide listing URLs, they do not provide stable, permanent links to the images themselves. Listing URLs on Zameen.com are ephemeral; once a property is sold or taken off the market, the page (and its images) disappears.

**Augmentation Strategy:** A "Scrape-and-Store" pipeline is required. Using the Python-based scrapers identified in the research [10], the engineering team must iterate through the dataset immediately upon ingestion. The script should extract the image URLs and, crucially, download the image binaries to a persistent object store (like AWS S3). The RAG vector database should then reference these permanent S3 paths, not the fragile Zameen.com URLs.

#### 3.4.2 The "Neighborhood Vibe" Gap
**Issue:** Property descriptions describe the house, but rarely the neighborhood in detail. A user might ask, "Is this area safe?" or "Are there schools nearby?"—questions the listing text alone cannot answer.

**Augmentation Strategy:** The RAG system should be augmented with external knowledge bases. This involves creating a secondary collection of "Locality Profiles" for major areas (e.g., DHA Phase 5, Bahria Enclave). This data can be scraped from the "Area Guides" sections of portals or synthesized from Google Maps reviews. When a property is retrieved, the system should also retrieve the corresponding Locality Profile to enrich the answer.

#### 3.4.3 Multilingual Nuance (Urdu/English)
**Issue:** Pakistani real estate descriptions are often a code-switched mix of English and Urdu (transliterated). Words like "Ghar" (House), "Baithak" (Drawing room), or "Double Story" are common.

**Augmentation Strategy:** The embedding model chosen for the RAG pipeline must be multilingual. A standard English model (like BERT) might underperform. Models like `paraphrase-multilingual-MiniLM-L12-v2` or fine-tuned variants are necessary to capture the semantic similarity between "Drawing Room" and "Baithak."

## 4. Dataset Deep Dive: Automated Valuation Models (AVM) & Price Prediction
While RAG deals in semantics, Price Prediction deals in variance, correlation, and temporal stability. The requirements here shift from "rich text" to "clean numbers" and "historical depth." The goal is to build a model that can ingest the characteristics of a property and output a valid market value (PKR).

### 4.1 Primary Prediction Candidate: Housing Prices in Pakistan 2023
The "Housing Prices in Pakistan 2023" dataset [11] is the foundational dataset for national-level modeling.

#### 4.1.1 Categorical Cardinality
This dataset excels in its categorical coverage, providing `City`, `Province`, and `Location` [11].

**Significance:** Real estate pricing is fractal. A model must understand that a 1 Kanal house in "DHA Karachi" has a fundamentally different price curve than a 1 Kanal house in "DHA Lahore." The presence of explicit City and Province columns allows for the training of hierarchical models or the use of target encoding schemes to capture regional price baselines.

#### 4.1.2 Feature Completeness for Regression
It includes the "Holy Trinity" of real estate regression: `Area`, `Bedrooms`, and `Bathrooms`.

**Utility:** These three features typically account for 60-70% of the variance in pricing models. The dataset's explicit separation of these integers (as opposed to being buried in text) makes it immediately usable for training Gradient Boosting Regressors (XGBoost, CatBoost) or Random Forests [11].

### 4.2 Secondary Prediction Candidate: Pakistan Urban Real Estate Data
The "Pakistan Urban Real Estate Data" [4] is critical for time-series analysis due to its temporal metadata.

#### 4.2.1 Temporal Stamps
This dataset includes `Creation_date` and `Updation_date` [4].

**Crucial for Inflation Adjustment:** Pakistan has experienced double-digit inflation in recent years [12]. A price tag from 2021 is meaningless in 2024 without adjustment. These date columns allow the data scientist to "age" the prices. We can apply an inflation factor to older listings to bring them to "Current Value" before training the model, or use the date as a raw feature to let the model learn the inflation curve itself.

#### 4.2.2 "Purpose" Segmentation
It includes a `Purpose` column (Buy vs. Rent) [4].

**Modeling Necessity:** Rental yield models and capital value models are mathematically distinct. Mixing monthly rental prices (e.g., 50,000 PKR) with sale prices (e.g., 50,000,000 PKR) would destroy a model's convergence. This column allows for the strict separation of the dataset into two distinct training pipelines.

### 4.3 Tertiary Candidate: Housing Prices in Lahore (High-Density Regional Data)
For the user's specific interest in Punjab, the "Housing Prices in Lahore" dataset [5] offers the necessary depth.

#### 4.3.1 Locality Density
With over 17,000 records focused solely on Lahore [5], this dataset provides enough density to model micro-localities.

**Micro-Pricing:** In a national dataset, "Johar Town" might be a single category. In this Lahore-specific dataset, there may be enough data points to distinguish "Johar Town Phase 1" from "Johar Town Phase 2," capturing the subtle price differentials driven by development status and road access.

#### 4.3.2 Area Standardization
The snippet indicates a clean separation of Area into "Marla" or "Kanal" [5].

**Preprocessing Advantage:** This explicit unit labeling allows for a deterministic normalization function (e.g., `if unit == 'Kanal': area = area * 20`). This reduces the risk of parsing errors common in datasets where the unit is appended to the number string (e.g., "20 Marla").

### 4.4 Missing Pieces in Prediction Datasets & Macro-Economic Integration
The most glaring omission in all property listing datasets is the external economic context. Real estate does not exist in a vacuum; it is heavily influenced by the cost of borrowing (Interest Rates) and the purchasing power of the currency (Inflation). A model trained only on property features will fail to predict price movements caused by macroeconomic shocks.

To fix this, we must integrate external "Macro" datasets.

#### 4.4.1 The Inflation Augmentation
**Missing Piece:** Property prices rise with general inflation (CPI).
**Solution:** Utilize the "Pakistan Inflation Rate 1960-2024" dataset [13].
**Integration Logic:** This dataset provides monthly CPI figures. By joining this with the property listing datasets on the Month-Year key (derived from `Creation_date` or `date_added`), we can generate a new feature: `CPI_at_Listing`. This allows the model to understand that a price increase is partly due to currency devaluation, not just property appreciation.

#### 4.4.2 The Interest Rate Augmentation
**Missing Piece:** Mortgage rates and the KIBOR (Karachi Interbank Offered Rate) define liquidity. High rates suppress prices; low rates inflate them.
**Solution:** Utilize the State Bank of Pakistan (SBP) Policy Rate data [14].
**Integration Logic:** The SBP publishes the Policy Rate monthly. We can create a feature `Interest_Rate_at_Listing`. This is a powerful predictor for market turning points. For example, a sharp rise in interest rates often predicts a stagnation in asking prices.

#### 4.4.3 The Economic Health Augmentation
**Missing Piece:** General economic sentiment, GDP growth, and employment rates affect buyer confidence.
**Solution:** Utilize the "Pakistan Economic Indicators 1980-2022" dataset [16] and World Bank Data [17].
**Integration Logic:** Annual indicators like `GDP_Growth_Rate` or `Remittances_Inflow` (Pakistan is heavily dependent on remittances for real estate investment) can be joined on the Year key. This helps the model account for "boom" and "bust" years.

## 5. Candidate Datasets: The Concise Catalog
The following tables present the selected datasets, curated to meet the specific "RAG-Ready" and "Price-Prediction" criteria.

### 5.1 Table A: Datasets for RAG (Retrieval-Augmented Generation)
| Dataset Name | Source / ID | Est. Size | Key RAG Metadata Columns | Geography | Augmentation Needs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Explore Pakistan's Property Landscape** | Kaggle [3] | ~150k listings | `url` (for image scraping), `title`, `address`, `city`, `Latitude`, `Longitude` | National (Islamabad, Lahore, Karachi) | **High:** Scrape `url` to fetch full body text and `og:image`. |
| **Pakistan Urban Real Estate Data** | OpenDataBay [4] | ~93k listings | `Long Desc`, `Short Desc`, `Price in words`, `Society/Sector` | Top 10 Cities | **Low:** Contains dense text natively. Excellent for embeddings. |
| **Lahore House Listings (2025)** | Kaggle [9] | ~18k listings | `Link`, `Title`, `Location`, `Boolean Amenities` (Lawn, Library, Gym) | Lahore (Punjab) | **Medium:** Convert boolean columns into natural language sentences. |
| **Zameen.com Property Data** | Kaggle [8] | ~168k listings | `url`, `type`, `purpose`, `date_added` | National | **High:** Requires joining with image assets; good historical depth. |

### 5.2 Table B: Datasets for Price Prediction Models
| Dataset Name | Source / ID | Est. Size | Key Regression Features | Time Span | Augmentation Needs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Housing Prices in Pakistan 2023** | Kaggle [11] | ~6k (Master) | `City`, `Province`, `Area`, `Beds`, `Baths`, `Property ID` | 2023 | **Macro:** Join with 2023 monthly CPI/Interest Rate data. |
| **Pakistan Urban Real Estate Data** | OpenDataBay [4] | ~93k listings | `Creation_date`, `Updation_date`, `Price`, `City`, `Property Type` | 2023 | **Temporal:** Use date columns to align with SBP Policy Rates. |
| **Housing Prices in Lahore** | Kaggle [5] | ~17k listings | `Location` (Locality), `Area` (Marla/Kanal), `Price` | Historical | **Unit Norm:** Normalize Marla to 225/272 sq ft based on Locality. |
| **Zameen.com Archives (2019)** | Kaggle [18] | ~168k listings | `month`, `year`, `price`, `area_sqft`, `location_id` | 2019 (Historical) | **Trend:** Use to train model on pre-inflation shock patterns. |

### 5.3 Table C: Macro-Economic Datasets for Augmentation
| Dataset Name | Source / ID | Content & Granularity | Join Key | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Pakistan Inflation Rate (1960-2024)** | Kaggle [13] | Monthly CPI % | Month-Year | Normalize price history for inflation. |
| **State Bank of Pakistan Policy Rate** | CEIC / SBP [14] | Monthly Interest Rate % | Month-Year | Predict price cooling during rate hikes. |
| **Pakistan Economic Indicators** | Kaggle [16] | Annual GDP, Remittances | Year | Correlate market heat with economic health. |

## 6. Implementation Strategy: From Raw Data to Intelligence
Having identified the data, the final phase of this report outlines the engineering protocols required to operationalize these datasets.

### 6.1 The RAG Ingestion Pipeline
1.  **Selection:** Initiate the pipeline with the "Explore Pakistan's Property Landscape" dataset [3] due to its volume and URL preservation.
2.  **Enrichment (The Scraper):** Deploy a lightweight scraper (using BeautifulSoup or Selenium [10]) that iterates through the `url` column.
    *   **Target:** Extract the full property description text (often hidden behind a "Read More" button) and the primary image URL.
3.  **Storage:** Save the text to a "Document Store" (e.g., MongoDB) and the image to an Object Store (S3).
4.  **Vectorization:** Use the "Pakistan Urban Real Estate Data" [4] `Long Desc` column to fine-tune the embedding model. Since this column contains high-quality real estate vocabulary ("corner plot," "balloted," "possession"), fine-tuning the model on this specific corpus will improve retrieval accuracy significantly compared to a generic model.
5.  **Indexing:** Create a vector index (e.g., Pinecone/Milvus) where each vector is tagged with metadata: `City`, `Price_Range`, and `Bedrooms`. This allows for "Hybrid Search"—filtering by city first, then performing semantic search within that subset.

### 6.2 The Price Prediction Pipeline
1.  **Normalization (The Unit Converter):** Ingest "Housing Prices in Lahore" [5] and "Pakistan Real Estate Property Listings" [8]. Apply a strict area normalization logic:
    *   **Step 1:** Convert all explicit Kanal to Marla (1 Kanal = 20 Marla).
    *   **Step 2:** Detect Society. If Location contains "DHA" or "Bahria," `Area_SqFt = Total_Marla * 225`. Else, `Area_SqFt = Total_Marla * 272.25`.
2.  **Macro-Join:** Load the "Pakistan Inflation Rate" dataset [13]. Convert the `Creation_date` of every listing to a Month-Year string. Perform a Left Join to attach the `CPI_Index` and `Policy_Rate` to every listing row.
3.  **Outlier Removal:** Real estate data is prone to entry errors (e.g., an extra zero in the price). Group data by City and Bedrooms, calculate the Interquartile Range (IQR) for `Price_per_SqFt`, and remove listings falling outside 1.5x IQR.
4.  **Modeling:** Train a regressor (XGBoost) with the following feature set:
    *   **Property:** `Area_SqFt`, `Beds`, `Baths`, `Location_Embedding`
    *   **Macro:** `CPI_Index`, `Policy_Rate`, `USD_PKR_Rate`
    *   **Temporal:** `Month_Sin`, `Month_Cos` (to capture seasonality).

## 7. Conclusion
The ecosystem of open-source data for Pakistani real estate is robust, provided one navigates it with the right architectural mindset. We are not limited by a lack of data, but rather by the need for rigorous integration.

For RAG, the path forward relies on the "Explore Pakistan's Property Landscape" dataset, augmented by a targeted scraping layer to secure visual assets and full-text descriptions. This combination allows for a semantic search experience that captures the nuances of "luxury" and "lifestyle" inherent in the agent-written prose.

For Price Prediction, accuracy lies in the fusion of micro-data and macro-data. By taking the granular listing data from Kaggle and contextualizing it with the economic pulse data from the State Bank of Pakistan and World Bank, we can move beyond simple curve-fitting to create valuation models that are resilient to the economic volatility characteristic of the region.

This report confirms that all required components for these advanced PropTech systems—listings, descriptions, images, and economic indicators—are available in the public domain, waiting only to be engineered into a cohesive whole.
