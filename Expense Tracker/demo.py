from flask import Flask, render_template, request, redirect, flash, url_for, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from data_schema import db, User, Expense, Exp_Category, Inc_Category, Income

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



if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)