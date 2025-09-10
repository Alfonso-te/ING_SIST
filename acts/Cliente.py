import socket

def run_client():
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    server_ip = "127.0.0.1"
    server_port = 5000  # debe coincidir con el puerto del servidor

    try:
        client.connect((server_ip, server_port))
        print("Conectado al servidor.\n")

        while True:
            msg = input("Ingresa el número de la pregunta (1-50) o una operación (ej. 'Cuanto es 3 mas 3') o 'cerrar' para salir: ")
            client.send(msg.encode("utf-8")[:1024])

            response = client.recv(1024).decode("utf-8")

            if response.lower() == "cerrar":
                print("El servidor cerró la conexión.")
                break

            print(f"Servidor: {response}\n")

    except ConnectionRefusedError:
        print("No se pudo conectar. Verifica que el servidor esté activo.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()
        print("Conexión cerrada.")

run_client()
