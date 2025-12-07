
import os
from pathlib import Path

content = """term,category,urdu,description
Real Estate,Domain,"ریئل اسٹیٹ, جائیداد",General domain term
Property,Domain,"پراپرٹی, جائیداد, اثاثہ",General property term
House,Property Type,"گھر, مکان, کوٹھی, بنگلہ",Residential unit
Flat,Property Type,"فلیٹ, اپارٹمنٹ",Residential unit
Apartment,Property Type,"اپارٹمنٹ, فلیٹ",Residential unit
Plot,Property Type,"پلاٹ, زمین",Land unit
Commercial,Property Type,"کمرشل, تجارتی",Commercial property
Residential,Property Type,"رہائشی",Residential property
Penthouse,Property Type,"پینٹ ہاؤس",Luxury top floor unit
Farm House,Property Type,"فارم ہاؤس",Agricultural/Luxury
Shop,Property Type,"دکان, شاپ",Commercial unit
Office,Property Type,"دفتر, آفس",Commercial unit
Plaza,Property Type,"پلازہ",Commercial building
Square Feet,Measurement,"سکوائر فٹ, مربع فٹ",Area unit
Square Yards,Measurement,"سکوائر یارڈ, گز",Area unit
Marla,Measurement,"مرلہ",Local area unit (~225-272 sqft)
Kanal,Measurement,"کنال",Local area unit (20 Marlas)
Acre,Measurement,"ایکڑ, قلعہ",Large area unit
Price,Financial,"قیمت, دام, ریٹ",Cost
Budget,Financial,"بجت, گنجائش",Spending limit
Crore,Number,"کروڑ",10 Million
Lakh,Number,"لاکھ",100 Thousand
Thousand,Number,"ہزار",1000
Million,Number,"ملین",10 Lakh
Billion,Number,"بلین, ارب",100 Crore
Location,Location,"لوکیشن, مقام, جگہ, ایریہ",Place
City,Location,"شہر",City
Society,Location,"سوسائٹی, ہاؤسنگ سکیم",Housing development
Phase,Location,"فیز",Development phase
Block,Location,"بلاک",Development block
Sector,Location,"سیکٹر",Development sector
DHA,Location,"ڈی ایچ اے, ڈیفنس",Defense Housing Authority
Bahria Town,Location,"بحریہ ٹاؤن, بحریہ",Bahria Town
Gulberg,Location,"گلبرگ",Major area in Lahore
Johar Town,Location,"جوہر ٹاؤن",Major area in Lahore
Wapda Town,Location,"واپڈا ٹاؤن",Housing society
Askari,Location,"عسکری",Housing society
Cantt,Location,"کینٹ, چھاؤنی",Cantonment area
Sale,Action,"سیل, فروخت, بیچنا",Selling
Rent,Action,"کرایہ",Renting
Buy,Action,"خریدنا, لینا",Buying
Invest,Action,"سرمایہ کاری, انویسٹ",Investing
Visit,Action,"وزٹ, دیکھنا, چکر لگانا",Physical checking
Booking,Action,"بکنگ",Reserving
Possession,Legal,"قبضہ",Ownership handover
Transfer,Legal,"ٹرانسفر, انتقال",Ownership transfer
Registry,Legal,"رجسٹری",Legal ownership doc
NOC,Legal,"این او سی",No Objection Certificate
Installment,Financial,"قسط, اقساط",Payment parts
Down Payment,Financial,"ڈاؤن پیمنٹ, ایڈوانس",Initial payment
Cash,Financial,"کیش, نقد",Full payment
Bedroom,Feature,"بیڈروم, کمرہ",Sleeping room
Bathroom,Feature,"باتھ روم, غسل خانہ, اٹیچ باتھ",Washroom
Kitchen,Feature,"کچن, باورچی خانہ",Cooking area
Garage,Feature,"گیراج, کار پورچ",Parking area
Lawn,Feature,"لان, باغچہ",Garden
Double Story,Feature,"ڈبل سٹوری",Two floors
Single Story,Feature,"سنگل سٹوری",One floor
Corner,Feature,"کارنر, کونے والا",Corner plot/house
Park Facing,Feature,"پارک فیسنگ",Facing a park
Main Boulevard,Feature,"مین بلیوارڈ, مین روڈ",Main road
Gas,Utility,"گیس, سوئی گیس",Utility
Electricity,Utility,"بجلی",Utility
Water,Utility,"پانی",Utility
Sewerage,Utility,"سیوریج",Utility
Furnished,Condition,"فرنشڈ, آباد",With furniture
Brand New,Condition,"برانڈ نیو, نیا",Newly built
Old,Condition,"پرانا",Used property
Files,Legal,"فائل",Plot file (pre-possession)
Balloting,Legal,"بیلوٹنگ, قرعہ اندازی",Allocation process
I want to buy a house,Sentence,"میں ایک گھر خریدنا چاہتا ہوں, مجھے گھر چاہیے",Intent
What is the price?,Sentence,"قیمت کیا ہے؟, اس کا ریٹ کیا ہے؟",Query
Show me plots in DHA,Sentence,"مجھے ڈی ایچ اے میں پلاٹ دکھائیں",Query
Is this available?,Sentence,"کیا یہ دستیاب ہے؟",Availability
I have a budget of 1 Crore,Sentence,"میرا بجٹ ایک کروڑ ہے",Budget constraint
Call me back,Sentence,"مجھے واپس کال کریں",Contact
Send me details,Sentence,"مجھے تفصیلات بھیجیں",Info request
Where is this located?,Sentence,"یہ کہاں واقع ہے؟",Location query
How many bedrooms?,Sentence,"کتنے کمرے ہیں؟",Feature query
Is gas available?,Sentence,"کیا گیس موجود ہے؟",Utility query
I want to sell my plot,Sentence,"میں اپنا پلاٹ بیچنا چاہتا ہوں",Intent
Are installments available?,Sentence,"کیا قسطوں پر دستیاب ہے؟",Financial query
Final price?,Sentence,"فائنل قیمت کیا ہوگی؟, آخری کیا ہے؟",Negotiation
Corner plot required,Sentence,"مجھے کارنر پلاٹ چاہیے",Preference
Near park,Sentence,"پارک کے قریب",Preference
Ten Marla house,Sentence,"دس مرلہ گھر",Size specific
Five Marla plot,Sentence,"پانچ مرلہ پلاٹ",Size specific
One Kanal bungalow,Sentence,"ایک کنال کوٹھی",Size specific
Ground floor,Sentence,"گراؤنڈ فلور, نچلی منزل",Floor specific
First floor,Sentence,"فرسٹ فلور, پہلی منزل",Floor specific
Basement,Sentence,"بیسمنٹ, تہہ خانہ",Feature specific
"""

target_path = Path("data/asr/urdu/lexicon.csv")
target_path.parent.mkdir(parents=True, exist_ok=True)

with open(target_path, "w", encoding="utf-8") as f:
    f.write(content.strip())

print(f"Updated lexicon at {target_path}")
