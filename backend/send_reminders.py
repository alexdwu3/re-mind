import firebase_admin
from firebase_admin import credentials, firestore
from twilio.rest import Client
from datetime import datetime, timedelta

# Firebase Setup
cred = credentials.Certificate("/Users/alex/Documents/re-mind/re-mind-419f4-firebase-adminsdk-fbsvc-f48dd717ae.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Twilio Setup
account_sid = "your_twilio_account_sid"
auth_token = "your_twilio_auth_token"
client = Client(account_sid, auth_token)

def send_sms(to, message):
    """Send an SMS using Twilio."""
    client.messages.create(
        body=message,
        from_="your_twilio_number",
        to=to
    )

def check_habits():
    """Check Firestore for due/missed habits and send reminders."""
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)

    users_ref = db.collection("users").stream()
    for user in users_ref:
        user_data = user.to_dict()
        phone = user_data["phone"]
        username = user.id
        habits_ref = db.collection("habits").where("group", "array_contains", username).stream()

        due_today = []
        missed_yesterday = []

        for habit in habits_ref:
            habit_data = habit.to_dict()
            last_completed = habit_data.get("lastCompleted")
            frequency = habit_data["frequency"]

            if last_completed:
                last_completed_date = last_completed.date()
                days_since = (today - last_completed_date).days
            else:
                days_since = float("inf")  # Never completed

            if days_since >= frequency:
                due_today.append(habit_data["name"])
            if days_since == frequency + 1:
                missed_yesterday.append(habit_data["name"])

        if due_today:
            send_sms(phone, f"Good morning! Today's tasks: {', '.join(due_today)}")
        if missed_yesterday:
            send_sms(phone, f"You missed {', '.join(missed_yesterday)} yesterday. Try to do it today!")

# Run the function
check_habits()
