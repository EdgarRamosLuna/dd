# Persistencia de sesión

La aplicación mantiene la sesión del usuario activa usando `Preferences` para almacenar el `usuario` y el `usuario_id`. Al iniciar, `UsuarioProvider` lee esos valores, restablece el estado y marca `sesionCargada` en `true` para que las rutas puedan decidir si redirigir a `/home` o mostrar el formulario de acceso. Ningún temporizador elimina estas claves, de modo que la sesión permanece abierta hasta que el usuario invoque `cerrarSesion` manualmente, lo que sí borra los datos persistidos.
