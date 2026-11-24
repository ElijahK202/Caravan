// Skill tests for agents, graded on the server so the answers never reach the browser.
// Each test draws QUESTIONS_PER_TEST questions from its bank; PASS_MARK of them must be right.
export const QUESTIONS_PER_TEST = 8;
export const PASS_MARK = 6;

// a: index of the correct option.
export const TESTS = {
  bookkeeping: { name: "Bookkeeping & accounting", bank: [
    { q: "A client pays an invoice you recorded last month. Which accounts change?", o: ["Cash goes up, accounts receivable goes down", "Revenue goes up, cash goes up", "Accounts payable goes down, cash goes down", "Revenue goes down, accounts receivable goes up"], a: 0 },
    { q: "What is a bank reconciliation for?", o: ["Matching the books to the bank statement and explaining any differences", "Moving money between two bank accounts", "Calculating the business's income tax", "Approving new vendors"], a: 0 },
    { q: "Which of these is an expense, not an asset?", o: ["Office rent for this month", "A laptop the business will use for three years", "Money owed to the business by a customer", "Cash in the bank"], a: 0 },
    { q: "In double-entry bookkeeping, every transaction…", o: ["Has equal debits and credits", "Is recorded only once", "Must involve the bank account", "Is recorded at the end of the year"], a: 0 },
    { q: "A supplier's bill arrives that you'll pay in 30 days. Where does it go first?", o: ["Accounts payable", "Accounts receivable", "Owner's equity", "Revenue"], a: 0 },
    { q: "Gross profit is…", o: ["Revenue minus the cost of goods sold", "Revenue minus all expenses", "Cash in minus cash out", "Assets minus liabilities"], a: 0 },
    { q: "A receipt is missing for a $40 card charge. What's the best next step?", o: ["Ask the client for the receipt or a note on what it was before categorising it", "Categorise it as office supplies so the books balance", "Delete the transaction", "Record it as revenue"], a: 0 },
    { q: "Which report shows what a business owns and owes on a given date?", o: ["Balance sheet", "Profit and loss statement", "Cash flow forecast", "Aged receivables report"], a: 0 },
    { q: "Depreciation spreads the cost of…", o: ["A long-lived asset over its useful life", "Monthly rent over the year", "Payroll over each pay period", "Sales tax over each quarter"], a: 0 },
    { q: "A customer is 60 days late paying. Which report helps you spot this?", o: ["Aged receivables", "Balance sheet", "Trial balance", "General ledger summary"], a: 0 },
  ] },
  data: { name: "Data entry & spreadsheets", bank: [
    { q: "In Excel or Google Sheets, which formula adds up cells A1 to A10?", o: ["=SUM(A1:A10)", "=ADD(A1-A10)", "=TOTAL(A1,A10)", "=A1+A10"], a: 0 },
    { q: "You need to find a customer's email by their ID in another sheet. Which function fits best?", o: ["XLOOKUP or VLOOKUP", "CONCATENATE", "COUNTIF", "ROUND"], a: 0 },
    { q: "A list has the same customer entered twice with different spellings. What do you do?", o: ["Flag the likely duplicate and confirm with the client before merging", "Delete whichever came second", "Leave both and say nothing", "Merge them and pick a spelling yourself"], a: 0 },
    { q: "Which date is unambiguous for clients in different countries?", o: ["2026-03-04", "03/04/2026", "4/3/26", "March-ish 2026"], a: 0 },
    { q: "What does freezing the top row in a spreadsheet do?", o: ["Keeps the header visible while you scroll", "Stops anyone from editing it", "Hides it", "Sorts the sheet by that row"], a: 0 },
    { q: "Which formula counts cells in B2:B50 that say \"Paid\"?", o: ["=COUNTIF(B2:B50,\"Paid\")", "=SUM(B2:B50,\"Paid\")", "=COUNT(\"Paid\")", "=IF(B2:B50=\"Paid\")"], a: 0 },
    { q: "You're typing 500 invoices from PDFs. What's the best way to keep accuracy high?", o: ["Spot-check a sample against the source and total the amounts to compare", "Type as fast as possible and fix errors if the client notices", "Copy the first row's values down to save time", "Skip any that are hard to read"], a: 0 },
    { q: "A cell shows ##### in Excel. What usually causes this?", o: ["The column is too narrow to show the number or date", "The formula has an error", "The file is corrupted", "The cell is protected"], a: 0 },
    { q: "Why use data validation (a drop-down list) in a column?", o: ["So people can only enter allowed values", "To make the column calculate totals", "To encrypt the column", "To hide the column from others"], a: 0 },
    { q: "Which file format keeps only plain values, with no formulas or formatting?", o: ["CSV", "XLSX", "PDF", "DOCX"], a: 0 },
  ] },
  writing: { name: "Writing & editing (English)", bank: [
    { q: "Which sentence is correct?", o: ["Their team finished its report on time.", "There team finished it's report on time.", "They're team finished its report on time.", "Their team finished it's report on time."], a: 0 },
    { q: "Pick the clearest email subject line for a delayed shipment.", o: ["Order #4821 will arrive Friday instead of Tuesday", "Update", "Hi!!", "About the thing"], a: 0 },
    { q: "Which word fits: \"The new policy will ___ everyone in the office.\"", o: ["affect", "effect", "affection", "effectively"], a: 0 },
    { q: "Which is the most concise version?", o: ["Please reply by Friday.", "At your earliest possible convenience, please be so kind as to reply by Friday.", "It would be appreciated if a reply could be sent by Friday.", "Reply Friday by please."], a: 0 },
    { q: "Where does the comma belong? \"However we can still meet tomorrow.\"", o: ["After \"However\"", "After \"we\"", "After \"meet\"", "No comma is needed"], a: 0 },
    { q: "Which sentence uses the apostrophe correctly?", o: ["The client's files are ready.", "The clients' file's are ready.", "The client's file's are ready.", "The clients file's are ready."], a: 0 },
    { q: "A client asks you to proofread a contract. You think a clause is legally risky. What do you do?", o: ["Fix grammar only and flag the clause for them to check with a lawyer", "Rewrite the clause the way you think is better", "Delete the clause", "Say nothing"], a: 0 },
    { q: "Which is a complete sentence?", o: ["The meeting was moved to Thursday.", "Because the meeting was moved.", "Moved to Thursday, the meeting.", "When the meeting on Thursday."], a: 0 },
    { q: "\"Fewer\" or \"less\": \"We received ___ complaints this month.\"", o: ["fewer", "less", "lesser", "least"], a: 0 },
    { q: "What's the best way to open a reply to an upset customer?", o: ["Acknowledge the problem and say what you'll do next", "Explain why it wasn't your fault", "Quote the terms of service", "Ask them to calm down"], a: 0 },
  ] },
  customer: { name: "Customer support", bank: [
    { q: "A customer is angry about a late order. What do you do first?", o: ["Acknowledge their frustration and check the order status", "Tell them delays happen", "Transfer them immediately", "Offer a full refund before checking anything"], a: 0 },
    { q: "Someone emails asking you to change the delivery address and send the order to a new country. What's the safest step?", o: ["Verify they're the account holder before changing it", "Change it right away so they're happy", "Cancel the order", "Ask them to send their password"], a: 0 },
    { q: "You don't know the answer to a customer's question. What should you say?", o: ["That you'll find out and when they'll hear back", "Guess so they get a fast answer", "That it's not your job", "Nothing, and close the ticket"], a: 0 },
    { q: "Which ticket should you handle first?", o: ["A customer who was charged twice", "A question about store opening hours", "A compliment about a product", "A newsletter unsubscribe request"], a: 0 },
    { q: "A customer asks for their card number to be read back to confirm it. What do you do?", o: ["Never read full card details; confirm only the last four digits", "Read out the full number", "Email them the full number", "Send it by text message"], a: 0 },
    { q: "What does \"first contact resolution\" mean?", o: ["Solving the issue in the first interaction", "Replying within one minute", "Assigning the ticket to the first available agent", "The first ticket of the day"], a: 0 },
    { q: "A customer threatens to post a bad review unless they get a refund that policy doesn't allow. What do you do?", o: ["Stay calm, explain the options policy allows and escalate if needed", "Give the refund to avoid the review", "Threaten to ban them", "Ignore them"], a: 0 },
    { q: "When closing a resolved chat, it's best to…", o: ["Summarise what was done and check if they need anything else", "End the chat immediately", "Ask them to rate you five stars", "Send a long survey first"], a: 0 },
    { q: "Which tone fits most support replies?", o: ["Friendly, clear and professional", "Very formal and legal", "Casual slang and emojis", "Short one-word answers"], a: 0 },
    { q: "A caller asks you to reset a password and sounds rushed, saying they're the CEO. What do you do?", o: ["Follow the normal identity check, whoever they say they are", "Skip the check because it's the CEO", "Give them a temporary password right away", "Hang up"], a: 0 },
  ] },
  it: { name: "IT support", bank: [
    { q: "A user can't reach any websites but is connected to Wi-Fi. What's a good first check?", o: ["Whether other devices work and whether restarting the router helps", "Reinstall the operating system", "Replace the laptop", "Buy a new Wi-Fi plan"], a: 0 },
    { q: "What does two-factor authentication add?", o: ["A second proof of identity, like a code from an app", "A second password that's the same as the first", "Faster logins", "A backup of your files"], a: 0 },
    { q: "An email says the user's account will be closed unless they log in through a link. What is it most likely?", o: ["Phishing", "A routine notice", "A software update", "Spam that is safe to click"], a: 0 },
    { q: "Which is the strongest password approach?", o: ["A long unique passphrase stored in a password manager", "The same strong password everywhere", "Your pet's name plus 123", "A short password changed every week"], a: 0 },
    { q: "A printer shows as offline. Which step comes first?", o: ["Check it's powered on and on the same network, then restart it", "Reinstall Windows", "Delete the printer driver folder", "Buy a new printer"], a: 0 },
    { q: "What's the purpose of a backup that follows the 3-2-1 rule?", o: ["Three copies, on two kinds of media, with one off-site", "Backing up three times a day", "Three passwords for two accounts", "One backup kept on the same drive"], a: 0 },
    { q: "A user's computer is suddenly very slow. A good first step is to…", o: ["Check what's using CPU and memory in Task Manager or Activity Monitor", "Format the hard drive", "Turn off the antivirus", "Unplug the monitor"], a: 0 },
    { q: "Why shouldn't you ask a client for their password, even to help them?", o: ["It breaks security; use a reset or have them type it themselves", "Passwords are too long to read out", "It's slower", "It's fine to ask"], a: 0 },
    { q: "What does a VPN mainly do?", o: ["Encrypts traffic between the device and the VPN server", "Speeds up the internet", "Removes viruses", "Backs up files"], a: 0 },
    { q: "A shared spreadsheet should only be seen by two people. What's the right sharing setting?", o: ["Share with those two accounts only", "Anyone with the link can view", "Public on the web", "Email it as an attachment to everyone"], a: 0 },
  ] },
  admin: { name: "Executive & admin support", bank: [
    { q: "Your client asks for a meeting with someone in London. You're in Manila and the client is in New York. What do you do?", o: ["Propose times in each person's local time zone", "Use your own time zone in the invite", "Pick a time and let them figure it out", "Use UTC only without explaining"], a: 0 },
    { q: "Two meetings are double-booked on the client's calendar. What's the best move?", o: ["Ask the client which to keep, then reschedule the other with an apology", "Cancel both", "Keep the one booked first without asking", "Leave both and see what happens"], a: 0 },
    { q: "An email that looks like it's from your client asks you to buy gift cards urgently. What do you do?", o: ["Confirm with the client by another channel before doing anything", "Buy them quickly", "Reply asking for the card amounts", "Forward it to the client's contacts"], a: 0 },
    { q: "How should you keep track of the client's travel bookings?", o: ["One itinerary with confirmation numbers, times in local time and contacts", "Leave them in separate emails", "Memorise them", "Only keep the flight numbers"], a: 0 },
    { q: "The client's inbox has 900 unread emails. Where do you start?", o: ["Sort by urgency and sender, flag what needs the client, archive the rest by agreed rules", "Delete everything older than a week", "Reply to every email in order", "Mark them all as read"], a: 0 },
    { q: "A vendor asks for the client's home address. What do you do?", o: ["Check with the client before sharing personal details", "Send it right away", "Make one up", "Post it in a shared channel"], a: 0 },
    { q: "When drafting an email on the client's behalf, you should…", o: ["Match their tone and get approval if it's sensitive", "Write in your own style and send it", "Use lots of exclamation marks", "Copy everyone in their contacts"], a: 0 },
    { q: "What's a good way to confirm tasks at the end of the day?", o: ["A short summary of what's done, what's pending and what needs their decision", "Nothing unless they ask", "A long list of every email you read", "A voice note with no details"], a: 0 },
    { q: "Your client asks you to log in to their bank to pay bills. What's the safest setup?", o: ["Ask them to add you as a delegate user with limited access", "Ask for their password and security answers", "Use their saved password in their browser", "Pay from your own account"], a: 0 },
    { q: "You made a mistake that cost the client a missed meeting. What do you do?", o: ["Tell them promptly, apologise and explain how you'll prevent it", "Hope they don't notice", "Blame the calendar app", "Quietly reschedule without telling them"], a: 0 },
  ] },
};

// Picks questions and shuffles each one's options. Returns what the browser sees plus the key to keep server-side.
export function makeTest(field, rand = Math.random) {
  const t = TESTS[field];
  const pick = [...t.bank].sort(() => rand() - 0.5).slice(0, QUESTIONS_PER_TEST);
  const questions = [], key = [];
  for (const item of pick) {
    const order = item.o.map((_, i) => i).sort(() => rand() - 0.5);
    questions.push({ q: item.q, o: order.map(i => item.o[i]) });
    key.push(order.indexOf(item.a));
  }
  return { questions, key };
}
