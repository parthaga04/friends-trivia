import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = 'Questions'

headers = ['Round', 'Category', 'Question', 'Answer', 'Points', 'Lightning']
fill   = PatternFill(start_color='FF6B35', end_color='FF6B35', fill_type='solid')
bold_w = Font(bold=True, color='FFFFFF', size=12)

for c, h in enumerate(headers, 1):
    cell = ws.cell(row=1, column=c, value=h)
    cell.font = bold_w
    cell.fill = fill
    cell.alignment = Alignment(horizontal='center')

rows = [
    ['Regular', 'The Apartment',  "What is the number of Monica and Chandler's apartment after they swap with Joey?", '19 (was 20)', 10, False],
    ['Regular', 'Characters',     "What is Chandler Bing's actual job title?", 'Statistical analysis and data reconfiguration', 10, False],
    ['Regular', 'Characters',     "What is Joey's character name on Days of Our Lives?", 'Dr. Drake Ramoray', 10, False],
    ['Regular', 'Relationships',  "How many times does Ross get divorced throughout the series?", '3', 10, False],
    ['Regular', 'Catchphrases',   'Complete: "We were on a ___"', 'break', 10, False],
    ['Regular', 'Food',           "What food will Joey NEVER share?", 'His food / sandwiches', 10, False],
    ['Regular', 'Music',          "What is the name of Phoebe's most famous original song?", 'Smelly Cat', 10, False],
    ['Regular', 'Pets',           "What is the name of Ross's pet monkey?", 'Marcel', 10, False],
    ['Regular', 'Episodes',       "What is the name of the trivia game episode where Monica and Rachel bet their apartment?", 'The One With the Embryos', 15, False],
    ['Regular', 'Fashion',        "What color is the iconic couch at Central Perk?", 'Orange', 10, False],
    ['Hard',    'Deep Cut',       "What is the name of the TV Guide subscription under which Chandler and Joey receive their mail?", 'Miss Chanandler Bong', 20, False],
    ['Hard',    'Deep Cut',       "What are 'the numbers' according to Monica's guide to a happy partner?", '7', 20, False],
    ['Hard',    'Deep Cut',       "What is the name of the stuffed penguin Joey sleeps with?", 'Hugsy', 20, False],
    ['Hard',    'Cameos',         "Which famous actor played Elizabeth's dad Paul Stevens?", 'Bruce Willis', 20, False],
    ['Hard',    'Deep Cut',       "What is the name of the holiday armadillo?", 'The Holiday Armadillo (Ross dressed up to teach Ben about Hanukkah)', 20, False],
    ['Hard',    'Deep Cut',       "What were the rules Monica explained about the seven?", 'Seven! Seven! Seven! (erogenous zones)', 20, False],
    ['Lightning', 'Speed Round',  'Who plays Rachel Green?', 'Jennifer Aniston', 5, True],
    ['Lightning', 'Speed Round',  'Who plays Monica Geller?', 'Courteney Cox', 5, True],
    ['Lightning', 'Speed Round',  'Who plays Phoebe Buffay?', 'Lisa Kudrow', 5, True],
    ['Lightning', 'Speed Round',  'Who plays Joey Tribbiani?', 'Matt LeBlanc', 5, True],
    ['Lightning', 'Speed Round',  'Who plays Chandler Bing?', 'Matthew Perry', 5, True],
    ['Lightning', 'Speed Round',  'Who plays Ross Geller?', 'David Schwimmer', 5, True],
    ['Lightning', 'Speed Round',  'How many seasons does Friends have?', '10', 5, True],
    ['Lightning', 'Speed Round',  'What city is Friends set in?', 'New York City', 5, True],
    ['Lightning', 'Speed Round',  'What is the name of the coffee shop?', 'Central Perk', 5, True],
    ['Lightning', 'Speed Round',  "What is the name of Ross and Monica's parents?", 'Jack and Judy Geller', 5, True],
    ['Lightning', 'Speed Round',  "Finish the theme song: 'I'll be there for ___'", 'you', 5, True],
    ['Lightning', 'Speed Round',  "What does FRIENDS stand for? (trick question)", 'Nothing — it is not an acronym', 5, True],
]

for r, data in enumerate(rows, 2):
    for c, v in enumerate(data, 1):
        ws.cell(row=r, column=c, value=v)

for c, w in enumerate([12, 18, 62, 46, 8, 10], 1):
    ws.column_dimensions[get_column_letter(c)].width = w
ws.row_dimensions[1].height = 25

fname = 'friends_trivia_questions.xlsx'
wb.save(fname)
print(f'Created {fname} with {len(rows)} sample questions')
