from flask import request

usuarios = [
    {
        "email": "admin@teste.com",
        "senha": "123456"
    }
]

def autenticar():

    token = request.headers.get("Authorization")

    return bool(token)