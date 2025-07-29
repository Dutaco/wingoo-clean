# Wingoo Connect

Wingoo is a Flask-based web application that helps users connect through shared interests. Users can:

- Discover people with common passions
- Send and receive digital gifts
- Match with flight companions
- Upload and listen to personalized audio news
- Edit and manage their profile and interests

## 🛠️ Tech Stack

- Python (Flask)
- Jinja2 templates
- MySQL database
- Bootstrap 5 for UI
- Progressive Web App (PWA) support
- JavaScript for geolocation and interactivity

## 🚀 Getting Started Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/wingoo-clean.git
   cd wingoo-clean
   ```

2. Create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` file based on the example:

   ```bash
   cp .env.example .env
   ```

5. Run the app:

   ```bash
   python main.py
   ```

## 🌍 Deployment (Render.com)

This app is ready for deployment on [Render](https://render.com) using:

- `Procfile`
- `requirements.txt`
- `.env` environment variables
- MySQL (external or hosted)

## 📁 Project Structure

```
.
├── services/               # Additional Python services (optional)
├── static/                 # CSS, JS, images
├── templates/              # HTML templates (Jinja2)
├── app.py / main.py        # Flask entry points
├── models.py / database.py # Database schema
├── routes.py               # Flask route definitions
├── .env.example            # Sample environment config
├── Procfile                # Render deployment instruction
└── requirements.txt
```

## ✅ Features

- Sticky theme layout
- Responsive for mobile and desktop
- Flash messages
- Location-based zone detection
- PWA and service worker support

## 📄 License

This project is licensed under the MIT License.
