# Función general para aplicar Mínimos Cuadrados
def calcular_ajuste_lineal(x, y, nombre_ejercicio):
    n = len(x)
    
    # Validamos que ambas listas tengan el mismo tamaño
    if n != len(y):
        print("Error: Las listas X e Y deben tener el mismo tamaño.")
        return

    # Paso 1: Realizar las sumatorias necesarias
    sum_x = sum(x)
    sum_y = sum(y)
    sum_x2 = sum([val**2 for val in x])       # Sumatoria de x al cuadrado
    sum_xy = sum([xi * yi for xi, yi in zip(x, y)]) # Sumatoria de x*y

    # Paso 2: Calcular la pendiente (b)
    # Fórmula: (n * Σxy - Σx * Σy) / (n * Σx^2 - (Σx)^2)
    numerador = (n * sum_xy) - (sum_x * sum_y)
    denominador = (n * sum_x2) - (sum_x ** 2)
    
    b = numerador / denominador

    # Paso 3: Calcular la intersección (a)
    # Fórmula: Promedio_Y - b * Promedio_X
    promedio_x = sum_x / n
    promedio_y = sum_y / n
    
    a = promedio_y - (b * promedio_x)

    # Salida de resultados
    print(f"--- Resultados para: {nombre_ejercicio} ---")
    print(f"Número de datos (n): {n}")
    print(f"Pendiente (b): {b:.4f}")
    print(f"Intersección (a): {a:.4f}")
    print(f"Ecuación final: y = {a:.2f} + {b:.2f}x")
    print("-" * 30)
    print("\n")


# EJERCICIO 1: Notas de Alumnos
# X = Estadística (E), Y = Investigación Operativa (IO)
datos_x_notas = [86, 75, 69, 75, 90, 94, 83, 86, 71, 65, 84, 71, 62, 90, 83, 75, 71, 76, 84, 97]
datos_y_notas = [80, 81, 75, 81, 92, 95, 80, 81, 76, 72, 85, 72, 65, 93, 81, 70, 73, 72, 80, 98]

calcular_ajuste_lineal(datos_x_notas, datos_y_notas, "Ejercicio 1: Notas Alumnos")


# EJERCICIO 2: Empresa Química
# X = Detergente (m3), Y = Coste (€)
datos_x_empresa = [2200, 3400, 4600, 5500, 8000, 9100, 10000]
datos_y_empresa = [141000, 190000, 240000, 300000, 450000, 450000, 530000]

calcular_ajuste_lineal(datos_x_empresa, datos_y_empresa, "Ejercicio 2: Empresa Química")