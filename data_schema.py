from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()

class User(db.Model, UserMixin):
    __tablename__ = 'User'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable = False)
    password = db.Column(db.String(200), nullable=False)

class Exp_Category(db.Model):
    __tablename__ = 'exp_category'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('User.id'))
    expenses = db.relationship('Expense', backref='category', lazy=True)

class Inc_Category(db.Model):
    __tablename__ = 'inc_category'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('User.id'))
    incomes = db.relationship('Income', backref='category', lazy=True)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('User.id'))
    description = db.Column(db.String(200))
    category_id = db.Column(db.Integer, db.ForeignKey('exp_category.id'))

class Income(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.String(20), nullable=False)
    description = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('User.id'))
    category_id = db.Column(db.Integer, db.ForeignKey('inc_category.id'))