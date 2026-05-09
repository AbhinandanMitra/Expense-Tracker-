from flask import Flask, render_template, request, redirect, flash, url_for, jsonify, send_file
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from data_schema import db, User, Expense, Exp_Category, Inc_Category, Income
import io
from sqlalchemy import func
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

app = Flask(__name__)
app.config['SECRET_KEY'] = 'mysecretkey'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'show_login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User,int(user_id))

@app.route("/", methods = ["GET","POST"])
def show_login():
    if request.method == 'POST':
        user = User.query.filter_by(username = request.form['username']).first()

        if user and check_password_hash(user.password, request.form['password']):
            login_user(user)
            return redirect('/index')
        else:
            flash('Invalid username or password!','error')
    return render_template("auth.html")

@app.route("/register", methods = ["GET","POST"])
def show_register():
    if request.method == "POST":
        username = request.form['username']
        password = generate_password_hash(request.form['password'])

        if User.query.filter_by(username = username).first():
            flash('Username already exists...', 'error')
        else:
            new_user = User(username = username,  password = password)
            db.session.add(new_user)
            db.session.commit()
            flash("Registration Successful... Please Login",'success')
    return redirect('/')

@app.route("/index")
@login_required
def show_index():
    user_expenses = Expense.query.filter_by(user_id=current_user.id).all()
    user_incomes = Income.query.filter_by(user_id=current_user.id).all() 
    exp_category = Exp_Category.query.filter_by(user_id=current_user.id).all()
    inc_category = Inc_Category.query.filter_by(user_id=current_user.id).all()

    exp_list = [{
        "id": e.id,
        "amount": e.amount,
        "date": e.date,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "description": e.description if e.description else "",
        "category_name": e.category.name if e.category else "Uncategorized",
        "type": "expense"
    } for e in user_expenses]

    inc_list = [{
        "id": i.id,
        "amount": i.amount,
        "date": i.date,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "description": i.description if i.description else "",
        "category_name": i.category.name if i.category else "Uncategorized",
        "type": "income"
    } for i in user_incomes]

    monthly_inc = [0] * 12
    monthly_exp = [0] * 12
    
    for i in user_incomes:
        m = int(i.date.split('-')[1]) - 1
        monthly_inc[m] += i.amount
    for e in user_expenses:
        m = int(e.date.split('-')[1]) - 1
        monthly_exp[m] += e.amount

    # 4. Extract categories list & aggregate individual sector expenses for Doughnut Chart 
    unique_exp_cats = list(set([e['category_name'] for e in exp_list]))
    cat_sums = [sum(e['amount'] for e in exp_list if e['category_name'] == cat) for cat in unique_exp_cats]

    # 5. Pack everything neatly inside the centralized payload dictionary
    userData = {
        "exp": exp_list,           # JS uses user_data.exp
        "inc": inc_list,           # JS uses user_data.inc
        "inc_totals": [i.amount for i in user_incomes], # JS reduce() will find this
        "exp_cats": unique_exp_cats, # JS uses user_data.exp_cats
        "exp_totals": cat_sums,      # JS uses for both categories and total sum
        "monthly_inc_summary": monthly_inc,
        "monthly_exp_summary": monthly_exp
    }     

    return render_template(
        "index.html", 
        name=current_user.username, 
        userData=userData, 
        exp_category=exp_category, 
        inc_category=inc_category
    )


@app.route('/add_expense', methods=["POST"])
@login_required
def add_expense():
    data = request.get_json()
    category_name = data.get('category_name')
    amount = data.get('amount')
    date_str = data.get('date')
    
    description = data.get('description', '')
    category = Exp_Category.query.filter_by(name=category_name, user_id=current_user.id).first()

    if not category:
        category = Exp_Category(name=category_name, user_id=current_user.id)
        db.session.add(category)
        db.session.commit()

    new_expense = Expense(
        amount=float(amount),
        date=date_str,
        description=description, 
        user_id=current_user.id,
        category_id=category.id
    )

    db.session.add(new_expense)
    db.session.commit()
        
    return jsonify({
        "status": "success",
        "expense": {
            "id": new_expense.id,
            "amount": new_expense.amount,
            "date": new_expense.date,
            "description": new_expense.description,
            "category_name": category.name,
            "type": "expense"
        },
        "created_at": new_expense.created_at.isoformat() 
    })


@app.route('/add_income', methods=["POST"])
@login_required
def add_income():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    category_name = data.get('category_name')
    amount = data.get('amount')
    date_str = data.get('date')

    description = data.get('description', '')
    if not all([category_name, amount, date_str]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    # 1. Lookup or create the Income Category for the current user
    category = Inc_Category.query.filter_by(name=category_name, user_id=current_user.id).first()
    if not category:
        category = Inc_Category(name=category_name, user_id=current_user.id)
        db.session.add(category)
        db.session.commit()

    # 2. Instantiate and commit the new Income entry
    new_income = Income(
        amount=float(amount),
        date=date_str,
        description=description, # Add this line
        user_id=current_user.id,
        category_id=category.id
    )
    db.session.add(new_income)
    db.session.commit()

    return jsonify({
        "status": "success",
        "income": {
            "id": new_income.id,
            "amount": new_income.amount,
            "date": new_income.date,
            "description": new_income.description,
            "category_name": category.name,
            "type": "income"
        },
        "created_at": new_income.created_at.isoformat()
    })


@app.route('/download-report/<month>')
@login_required
def download_report(month):
    """
    Generates a simple, clean PDF budget report for the selected month.
    Expects 'month' in 'YYYY-MM' format (for example, '2026-05').
    """
    # 1. Get spending and income data from the database
    category_spending = db.session.query(
        Exp_Category.name,  # Fetch the NAME, not the object or ID
        db.func.sum(Expense.amount)
    ).join(Expense, Expense.category_id == Exp_Category.id) \
    .filter(Expense.user_id == current_user.id) \
    .filter(db.extract('month', Expense.date) == month) \
    .group_by(Exp_Category.name).all()

    total_expenses = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        Expense.date.like(f"{month}%")
    ).scalar() or 0

    total_income = db.session.query(func.sum(Income.amount)).filter(
        Expense.user_id == current_user.id, # Adjust to match your user ownership column
        Income.date.like(f"{month}%")
    ).scalar() or 0

    remaining_balance = total_income - total_expenses
    balance_color = "#16a34a" if remaining_balance >= 0 else "#ef4444"

    # 2. Compare with last month's spending to find the trend
    try:
        curr_date = datetime.strptime(f"{month}-01", "%Y-%m-%d")
        prev_month_date = curr_date - timedelta(days=5) 
        prev_month_str = prev_month_date.strftime("%Y-%m")
    except Exception:
        prev_month_str = ""

    prev_total_expenses = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        Expense.date.like(f"{prev_month_str}%")
    ).scalar() or 0

    if prev_total_expenses > 0:
        trend_pct = ((total_expenses - prev_total_expenses) / prev_total_expenses) * 100
        trend_direction = "more" if trend_pct > 0 else "less"
    else:
        trend_pct = 0
        trend_direction = "same"

    # 3. Setup standard fonts and text sizes
    styles = getSampleStyleSheet()
    
    normal_style = styles['Normal']
    normal_style.textColor = colors.HexColor("#334155")
    normal_style.fontSize = 10
    normal_style.leading = 14

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'],
        fontName='Helvetica-Bold', fontSize=22, leading=26,
        textColor=colors.HexColor("#121212"), spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=10, leading=12,
        textColor=colors.HexColor("#fcc419"), spaceAfter=18 # Accent Gold
    )

    section_heading = ParagraphStyle(
        'SectionHeading', parent=styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=12, leading=15,
        textColor=colors.HexColor("#1e293b"), spaceBefore=18, spaceAfter=8
    )

    card_label = ParagraphStyle(
        'CardLabel', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9, leading=11,
        textColor=colors.HexColor("#64748b")
    )

    card_val = ParagraphStyle(
        'CardValue', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=14, leading=17,
        textColor=colors.HexColor("#121212")
    )

    table_header = ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9, leading=12,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9, leading=12,
        textColor=colors.HexColor("#334155")
    )

    insight_title = ParagraphStyle(
        'InsightTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=10, leading=13,
        textColor=colors.HexColor("#1e293b"), spaceAfter=3
    )

    # 4. Create the PDF document
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    elements = []

    # Title Page Header
    elements.append(Paragraph("MONTHLY BUDGET REPORT", title_style))
    formatted_month = datetime.strptime(month, "%Y-%m").strftime("%B %Y")
    elements.append(Paragraph(f"MONTH: {formatted_month.upper()}", subtitle_style))

    # Divider Line (Gold)
    divider = Table([[""]], colWidths=[7.5*inch], rowHeights=[3])
    divider.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fcc419")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(divider)
    elements.append(Spacer(1, 15))

    # --- Section 1: Income and Expense Summary ---
    elements.append(Paragraph("Monthly Summary", section_heading))
    summary_data = [
        [
            Paragraph("TOTAL INCOME", card_label),
            Paragraph("TOTAL SPENT", card_label),
            Paragraph("SAVINGS", card_label)
        ],
        [
            Paragraph(f"Rs. {total_income:,.2f}", ParagraphStyle('IncColor', parent=card_val, textColor=colors.HexColor("#16a34a"))),
            Paragraph(f"Rs. {total_expenses:,.2f}", ParagraphStyle('ExpColor', parent=card_val, textColor=colors.HexColor("#ef4444"))),
            Paragraph(f"Rs. {remaining_balance:,.2f}", ParagraphStyle('SavColor', parent=card_val, textColor=colors.HexColor(balance_color)))
        ]
    ]
    summary_table = Table(summary_data, colWidths=[2.5*inch, 2.5*inch, 2.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 15))

    # --- Section 2: Trend Comparison ---
    trend_text = "<b>How Your Spending Changed:</b> "
    if trend_direction == "more":
        trend_text += f"You spent <font color='#ef4444'><b>{trend_pct:.1f}% more</b></font> this month compared to last month (Rs. {prev_total_expenses:,.2f}). Try to cut back on unnecessary things next month to save more."
    elif trend_direction == "less":
        trend_text += f"Great job! You spent <font color='#16a34a'><b>{abs(trend_pct):.1f}% less</b></font> than last month (Rs. {prev_total_expenses:,.2f}). This helped you keep more money in your savings."
    else:
        trend_text += "You spent almost the exact same amount as last month. Your budget is running steady."

    trend_p = Paragraph(trend_text, ParagraphStyle('TrendBody', parent=normal_style, fontSize=9.5, leading=14))
    trend_card = Table([[trend_p]], colWidths=[7.5*inch])
    trend_card.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(trend_card)
    elements.append(Spacer(1, 15))

    # --- Section 3: Spending Table (Descending Order) ---
    elements.append(Paragraph("Spending by Category", section_heading))
    
    cat_table_data = [[
        Paragraph("<b>Category</b>", table_header),
        Paragraph("<b>Percentage of Total</b>", table_header),
        Paragraph("<b>Amount Spent</b>", table_header)
    ]]

    for cat, amount in category_spending:
        allocation_pct = (amount / total_expenses * 100) if total_expenses > 0 else 0
        
        category_text = str(cat) if cat is not None else "Uncategorized"
        cat_table_data.append([
            Paragraph(category_text, table_cell), # Line 413 fix
            Paragraph(f"{allocation_pct:.1f} %", table_cell),
            Paragraph(f"₹ {amount:,.2f}", ParagraphStyle('RightText', parent=table_cell, alignment=2))
        ])

    if not category_spending:
        cat_table_data.append([Paragraph("No spending recorded this month.", table_cell), "", ""])

    cat_table = Table(cat_table_data, colWidths=[3.2*inch, 2.0*inch, 2.3*inch])
    
    cat_table_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#121212")), # Dark Header
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
    ]
    for i in range(1, len(cat_table_data)):
        row_bg = colors.HexColor("#f8fafc") if i % 2 == 1 else colors.white
        cat_table_style.append(('BACKGROUND', (0, i), (-1, i), row_bg))
        cat_table_style.append(('TOPPADDING', (0, i), (-1, i), 6))
        cat_table_style.append(('BOTTOMPADDING', (0, i), (-1, i), 6))

    cat_table.setStyle(TableStyle(cat_table_style))
    elements.append(cat_table)
    elements.append(Spacer(1, 15))

    # --- Section 4: Simple Savings Tips ---
    elements.append(Paragraph("Simple Savings Tips", section_heading))
    
    # Common non-essential categories to analyze
    non_essential_domains = ['Dining Out', 'Entertainment', 'Shopping', 'Cabs', 'Leisure', 'Travel', 'Food']
    highest_non_essential = None
    highest_ne_amount = 0

    # Pick the non-essential category the user spent the most on
    for cat, amount in category_spending:
        if cat in non_essential_domains:
            highest_non_essential = cat
            highest_ne_amount = amount
            break

    tips_box = []
    if highest_non_essential:
        pct_of_outflow = (highest_ne_amount / total_expenses * 100) if total_expenses > 0 else 0
        tips_box.append(Paragraph(f"💡 Target Area: {highest_non_essential}", insight_title))
        
        # Actionable, simple feedback per category
        if highest_non_essential in ['Dining Out', 'Food']:
            tip_desc = f"You spent Rs. {highest_ne_amount:,.2f} on dining and eating out. This is {pct_of_outflow:.1f}% of all your spending. Try planning your meals or cooking at home more often next month to easily save money."
        elif highest_non_essential in ['Entertainment', 'Leisure']:
            tip_desc = f"You spent Rs. {highest_ne_amount:,.2f} on entertainment and hobbies. Check your monthly subscriptions and cancel any apps or services you do not use regularly."
        elif highest_non_essential in ['Shopping']:
            tip_desc = f"You spent Rs. {highest_ne_amount:,.2f} on shopping. Before you click buy, try waiting 48 hours. This simple wait helps you avoid buying things on impulse."
        else:
            tip_desc = f"Your spending in '{highest_non_essential}' reached Rs. {highest_ne_amount:,.2f}. Setting a firm spending limit for this category will help you stay within your budget."
        
        tips_box.append(Paragraph(tip_desc, normal_style))
        tips_box.append(Spacer(1, 10))
    else:
        tips_box.append(Paragraph("🎉 Excellent Spending Habits", insight_title))
        tips_box.append(Paragraph("You did not spend money on unnecessary categories this month. That is awesome! Try transferring 20% of your earnings directly into savings as soon as you get paid next month.", normal_style))
        tips_box.append(Spacer(1, 10))

    # Gold Rule: Save First, Spend Later
    tips_box.append(Paragraph("⭐ Golden Rule: Save First, Spend Later", insight_title))
    tips_box.append(Paragraph("The easiest way to save money is to put some aside the moment your income arrives, rather than trying to save what is left at the end of the month.", normal_style))

    # Render Tips Box
    insights_table = Table([[tips_box]], colWidths=[7.5*inch])
    insights_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fafafa")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
    ]))
    elements.append(insights_table)

    # Compile PDF and return binary stream
    doc.build(elements)
    buf.seek(0)
    
    return send_file(
        buf, 
        as_attachment=True, 
        download_name=f"Budget_Report_{month}.pdf", 
        mimetype='application/pdf'
    )

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)