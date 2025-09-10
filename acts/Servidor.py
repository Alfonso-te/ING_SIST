import socket
import re

def interpretar_operacion(frase):
    numeros = {
        "cero": 0, "0": 0,
        "uno": 1, "1": 1,
        "dos": 2, "2": 2,
        "tres": 3, "3": 3,
        "cuatro": 4, "4": 4,
        "cinco": 5, "5": 5,
        "seis": 6, "6": 6,
        "siete": 7, "7": 7,
        "ocho": 8, "8": 8,
        "nueve": 9, "9": 9,
        "diez": 10, "10": 10
    }

    operaciones = {
        "mas": "+", "más": "+", "suma": "+", "sumar": "+",
        "menos": "-", "resta": "-", "restar": "-",
        "por": "", "multiplicar": "",
        "entre": "/", "dividir": "/"
    }

    # Preprocesar la frase: quitar caracteres especiales y pasar a minúsculas
    frase = frase.lower()
    frase = re.sub(r"[^a-z0-9áéíóúüñ ]", "", frase)

    palabras = frase.split()
    num1 = None
    num2 = None
    operacion = None

    for palabra in palabras:
        if palabra in numeros and num1 is None:
            num1 = numeros[palabra]
        elif palabra in numeros and num1 is not None and num2 is None:
            num2 = numeros[palabra]
        elif palabra in operaciones and operacion is None:
            operacion = operaciones[palabra]

    if num1 is not None and num2 is not None and operacion is not None:
        try:
            if operacion == "/" and num2 == 0:
                return "Error: división entre cero."
            resultado = eval(f"{num1}{operacion}{num2}")
            return f"El resultado de la operación es: {resultado}"
        except Exception:
            return "No pude calcular la operación."
    else:
        return None


def run_server():
    # Diccionario base de conocimientos con 50 preguntas y respuestas
    qa_dict = {
        "1": ("¿Cómo te llamas?", "Alfonso Silva"),
        "2": ("¿Cuántos años tienes?", "22"),
        "3": ("¿Dónde vives?", "Guadalajara"),
        "4": ("¿Cuál es tu mayor pasión en la vida?", "Vivirla"),
        "5": ("¿Tienes algún sueño que aún no hayas cumplido?", "Tener una casa"),
        "6": ("¿Cuál es tu recuerdo favorito de la infancia?", "Jugar futbol"),
        "7": ("¿Si pudieras vivir en cualquier lugar?", "Dinamarca"),
        "8": ("¿Prefieres días soleados o lluviosos?", "Lluviosos"),
        "9": ("¿Qué valoras en una amistad?", "Honestidad y lealtad"),
        "10": ("¿Mayor desafío que enfrentaste?", "Mudarme"),
        "11": ("¿Tienes alguna tradición anual?", "No"),
        "12": ("¿Qué música escuchas para motivarte?", "Rap"),
        "13": ("¿Cenar con alguien famoso?", "Bob Marley"),
        "14": ("¿Qué disfrutas en tu tiempo libre?", "Escuchar música"),
        "15": ("¿Talento oculto?", "Basketball"),
        "16": ("¿Serie que más te marcó?", "Vikings"),
        "17": ("¿Eres extrovertido o introvertido?", "Extrovertido"),
        "18": ("¿Cómo es tu día perfecto?", "Pareja, paseo, amor y paz"),
        "19": ("¿Lección más valiosa?", "Vive el presente"),
        "20": ("¿Qué aprenderías al instante?", "Hablar alemán"),
        "21": ("¿Cuál es tu comida favorita?", "Tacos al pastor"),
        "22": ("¿Color favorito?", "Azul"),
        "23": ("¿Animal favorito?", "Perro"),
        "24": ("¿Deporte favorito?", "Basketball"),
        "25": ("¿Ciudad que quieres visitar?", "Tokio"),
        "26": ("¿Mayor miedo?", "Perder a mis seres queridos"),
        "27": ("¿Mayor logro?", "Graduarme"),
        "28": ("¿Libro favorito?", "El alquimista"),
        "29": ("¿Película favorita?", "Inception"),
        "30": ("¿Bebida favorita?", "Café"),
        "31": ("¿Eres más de mar o montaña?", "Montaña"),
        "32": ("¿Mayor inspiración?", "Mi familia"),
        "33": ("¿Qué superpoder elegirías?", "Volar"),
        "34": ("¿Playa favorita?", "Cancún"),
        "35": ("¿Red social favorita?", "Instagram"),
        "36": ("¿Eres madrugador o nocturno?", "Nocturno"),
        "37": ("¿Materia favorita en la escuela?", "Matematicas"),
        "38": ("¿Qué idioma te gustaría aprender?", "Japonés"),
        "39": ("¿Tu estación favorita?", "Invierno"),
        "40": ("¿Mayor motivación?", "Superarme cada día"),
        "41": ("¿Serie actual favorita?", "Dark"),
        "42": ("¿Juego favorito?", "Valorant"),
        "43": ("¿Aplicación favorita?", "Spotify"),
        "44": ("¿Fruta favorita?", "Sandía"),
        "45": ("¿Qué cambiarías del mundo?", "La desigualdad"),
        "46": ("¿Tienes mascotas?", "Sí, un perro"),
        "47": ("¿Cuál es tu hobbie principal?", "Jugar videojuegos"),
        "48": ("¿Qué valor consideras esencial?", "Respeto"),
        "49": ("¿Qué prefieres: café o té?", "Te"),
        "50": ("¿Mayor meta a futuro?", "Ser feliz y exitoso")
    }

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_ip = "127.0.0.1"
    port = 5000
    server.bind((server_ip, port))
    server.listen(5)
    print(f"Servidor escuchando en {server_ip}:{port}")

    while True:
        client_socket, client_address = server.accept()
        print(f"Conectado con {client_address[0]}:{client_address[1]}")

        while True:
            try:
                request = client_socket.recv(1024)
                if not request:
                    break

                request = request.decode("utf-8").strip()

                if request.lower() == "cerrar":
                    client_socket.send("cerrar".encode("utf-8"))
                    break

                if request in qa_dict:
                    question, answer = qa_dict[request]
                    response = f"Pregunta: {question} | Respuesta: {answer}"
                else:
                    operacion_respuesta = interpretar_operacion(request)
                    if operacion_respuesta:
                        response = operacion_respuesta
                    else:
                        response = "No tengo respuesta para esa pregunta u operación."

                print(f"Recibido: {request}")
                print(f"Respuesta: {response}")

                client_socket.send(response.encode("utf-8"))

            except ConnectionResetError:
                print("El cliente cerró la conexión abruptamente.")
                break

        client_socket.close()
        print("Conexión cerrada con el cliente.")

run_server()
