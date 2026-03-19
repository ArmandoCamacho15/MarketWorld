# GitHub Student Pack — Recursos útiles para MarketWorld

**Resumen:**
Este documento lista servicios del GitHub Student Pack útiles para desplegar y escalar MarketWorld, y ofrece una comparación práctica de opciones de hosting gratuitas/populares para un backend Laravel con frontend estático.

1) Recursos recomendados del Student Pack
- DigitalOcean: créditos para droplets y Managed Databases (útil para producción barata y control total).  
- Render: créditos y descuentos aplicables; fácil despliegue de apps y bases de datos administradas.  
- Railway: despliegue rápido de servicios y bases de datos para desarrollo; buen onboarding.  
- Heroku (si aplica): ya no tiene plan gratuito en muchos casos, revisar ofertas actuales.  
- Vercel: ideal para frontend estático y despliegue de assets (CDN, previews).  
- Netlify: alternativa para frontend estático con CI/CD integradas.  
- SendGrid: envío de correos transaccionales (SMTP/API).  
- MongoDB Atlas / PlanetScale / ElephantSQL: bases de datos administradas (según necesidades).  
- Sentry: monitoreo de errores en producción.  
- GitHub Actions: CI/CD ilimitado para estudiantes.

2) Comparativa rápida de hosting — enfoque: Laravel backend + frontend estático

Columnas: Servicio | ¿Adecuado para Laravel? | Bases de datos gestionadas | Facilidad de uso | Limitaciones gratuitas | Recomendación

- Render | Sí | Sí, managed DB | Alta — soporta Docker y servicios persistentes | Límite de recursos en free; plan de pago razonable | Recomendado para backend Laravel en proyectos estudiantiles y staging
- Railway | Sí (rápido para prototipos) | Sí | Muy fácil e inmediato | Espacio de disco/horas limitadas; filesystem efímero | Bueno para desarrollo y pruebas; no ideal para producción estable
- Heroku | Parcialmente (ver planes actuales) | Sí | Muy fácil históricamente | Plan gratuito limitado o descontinuado | No recomendado como primera opción ahora mismo
- Vercel | No (no para Laravel tradicional) | No | Excelente para frontend (Next.js, estático) | No apto para PHP backend persistente | Usar para frontend estático, combinado con otro host para backend

3) Recomendación práctica
- Desarrollo / staging rápido: usar **Railway** o **Render** para desplegar el backend y la DB; Railway acelera pruebas, Render ofrece más control para entornos que deben correr continuamente.  
- Frontend estático: desplegar en **Vercel** o **Netlify** para CDN rápido y previews de PRs.  
- Producción (si se desea más control y coste predecible): considerar **DigitalOcean** (con créditos del Student Pack) usando Droplets o App Platform, o usar Render con plan pago.  

4) Razones (breve)
- Laravel necesita un entorno con PHP-FPM y posibilidad de procesos persistentes (workers, cron). Render y DigitalOcean permiten esto; Vercel no.  
- Para tareas en background y colas, es útil tener Redis gestionado — Render y DigitalOcean lo soportan; Railway puede proveer Redis para desarrollo.  
- Usar Vercel/Netlify para el frontend reduce latencia y simplifica CI/CD (deploy automático desde GitHub).  

5) Próximos pasos sugeridos
- Identificar qué servicios gratuitos del Student Pack ya están activados en tu cuenta.  
- Decidir stack final (ej. Render para backend + Vercel para frontend) y documentar proceso de deploy en `docs/DEPLOYMENT.md`.  
- Preparar `docker/` con Dockerfile para Laravel y un pipeline de GitHub Actions que despliegue a Render / DigitalOcean.

Si quieres, genero ahora el `docs/DEPLOYMENT.md` con pasos concretos para desplegar Laravel en Render y el frontend en Vercel.
# Herramientas del GitHub Student Pack para MarketWorld

Esta lista te ayuda a aprovechar recursos gratuitos y profesionales para tu ERP.

---

## Hosting y despliegue
- **Railway** (deploy backend Laravel, base de datos, cron jobs)
- **Render** (deploy frontend y backend)
- **Heroku** (deploy backend, jobs)
- **Vercel** (deploy frontend estático)
- **Netlify** (deploy frontend estático)

## Base de datos
- **MongoDB Atlas** (DB NoSQL, backups, fácil integración)
- **PlanetScale** (MySQL escalable)
- **AWS Educate** (acceso a RDS, DynamoDB)

## Monitoreo y observabilidad
- **Sentry** (monitorización de errores frontend y backend)
- **LogRocket** (monitorización frontend)

## CI/CD y automatización
- **GitHub Actions** (automatización de tests, deploy, lint)
- **Travis CI** (alternativa para CI)

## Emails y notificaciones
- **SendGrid** (envío de emails transaccionales)
- **Mailgun** (envío de emails)
- **Mailtrap** (testing de emails)

## Almacenamiento y archivos
- **AWS Educate** (S3 para archivos, imágenes, backups)
- **DigitalOcean** (Spaces para archivos)
- **DockerHub** (almacenamiento de imágenes Docker)

## Dominios y SSL
- **Namecheap** (dominio gratis)
- **SSL for Free** (certificados SSL gratis)

## Otros
- **Canva Pro** (diseño gráfico para documentación y demos)
- **JetBrains** (licencia profesional para IDEs)

---

**Recomendación:**
- Usa Railway o Render para backend Laravel.
- Vercel o Netlify para frontend estático.
- Sentry para monitoreo de errores.
- SendGrid/Mailtrap para emails.
- GitHub Actions para CI/CD.
- MongoDB Atlas o PlanetScale para base de datos si quieres probar NoSQL/MySQL.

Consulta la página oficial para más opciones: https://education.github.com/pack
