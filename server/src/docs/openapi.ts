import { parse } from 'yaml'

/**
 * OpenAPI 3.0 de la API de EmpleoNow.
 * Se sirve en /api/docs (Swagger UI) y /api/openapi.json.
 */
const yaml = `
openapi: 3.0.3
info:
  title: EmpleoNow API
  version: 1.0.0
  description: |
    API de la plataforma de empleo EmpleoNow.
    Autenticación con access token Bearer (en memoria) + refresh token httpOnly.
servers:
  - url: /api
    description: Servidor actual
tags:
  - name: Auth
  - name: Vacantes
  - name: Postulaciones
  - name: Perfil
  - name: Empresa
  - name: Notificaciones
paths:
  /auth/register:
    post:
      tags: [Auth]
      summary: Registro de postulante
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [nombres, apellidos, correo, contrasena]
              properties:
                nombres: { type: string, minLength: 2 }
                apellidos: { type: string, minLength: 2 }
                correo: { type: string, format: email }
                contrasena: { type: string, minLength: 8 }
                turnstileToken: { type: string }
      responses:
        '201':
          description: Cuenta creada
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AuthResponse' }
        '409': { description: Correo ya registrado }
  /auth/register-company:
    post:
      tags: [Auth]
      summary: Registro de empresa
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [nombreEmpresa, nit, correo, contrasena]
              properties:
                nombreEmpresa: { type: string }
                nit: { type: string }
                correo: { type: string, format: email }
                contrasena: { type: string, minLength: 8 }
                telefono: { type: string }
                sector: { type: string }
                turnstileToken: { type: string }
      responses:
        '201':
          description: Empresa creada (estado activo)
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AuthResponse' }
        '409': { description: Correo o NIT duplicado }
  /auth/login:
    post:
      tags: [Auth]
      summary: Inicio de sesión (cualquier rol)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [correo, contrasena]
              properties:
                correo: { type: string, format: email }
                contrasena: { type: string }
                turnstileToken: { type: string }
      responses:
        '200':
          description: Sesión iniciada
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AuthResponse' }
        '401': { description: Credenciales inválidas }
  /auth/refresh:
    post:
      tags: [Auth]
      summary: Renueva el access token usando la cookie httpOnly
      responses:
        '200':
          description: Nuevo access token
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AuthResponse' }
        '401': { description: Sin sesión o token reutilizado }
  /auth/logout:
    post:
      tags: [Auth]
      summary: Revoca el refresh token
      responses:
        '204': { description: Sesión cerrada }
  /auth/me:
    get:
      tags: [Auth]
      summary: Usuario autenticado
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Usuario actual
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
  /vacancies:
    get:
      tags: [Vacantes]
      summary: Lista vacantes activas
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: query, name: search, schema: { type: string } }
        - { in: query, name: area, schema: { type: string } }
        - { in: query, name: type, schema: { type: string } }
        - { in: query, name: modality, schema: { type: string } }
      responses:
        '200':
          description: Vacantes
          content:
            application/json:
              schema:
                type: object
                properties:
                  vacancies:
                    type: array
                    items: { $ref: '#/components/schemas/Vacancy' }
  /profile:
    get:
      tags: [Perfil]
      summary: Perfil del postulante
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: Perfil }
    patch:
      tags: [Perfil]
      summary: Actualiza datos de contacto (ubicación cifrada en reposo)
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: Perfil actualizado }
  /applications:
    post:
      tags: [Postulaciones]
      summary: Postularse a una vacante
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [vacancyId]
              properties:
                vacancyId: { type: integer }
      responses:
        '201': { description: Postulación creada }
        '409': { description: Ya existe la postulación }
  /company/profile:
    get:
      tags: [Empresa]
      summary: Perfil y métricas de la empresa autenticada
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: Perfil de empresa }
    patch:
      tags: [Empresa]
      summary: Actualiza el perfil de empresa
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: Perfil actualizado }
  /company/vacancies:
    get:
      tags: [Empresa]
      summary: Vacantes de la empresa autenticada
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: Lista de vacantes }
    post:
      tags: [Empresa]
      summary: Crea una vacante
      security: [{ bearerAuth: [] }]
      responses:
        '201': { description: Vacante creada }
  /company/vacancies/{id}:
    patch:
      tags: [Empresa]
      summary: Edita una vacante propia
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: path, name: id, required: true, schema: { type: integer } }
      responses:
        '200': { description: Vacante actualizada }
        '404': { description: No existe o no pertenece a la empresa }
    delete:
      tags: [Empresa]
      summary: Elimina una vacante propia
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: path, name: id, required: true, schema: { type: integer } }
      responses:
        '204': { description: Eliminada }
  /company/vacancies/{id}/applicants:
    get:
      tags: [Empresa]
      summary: Postulantes de una vacante propia
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: path, name: id, required: true, schema: { type: integer } }
      responses:
        '200': { description: Postulantes }
  /company/applications/{id}:
    patch:
      tags: [Empresa]
      summary: Cambia el estado de una postulación
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: path, name: id, required: true, schema: { type: integer } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [estado]
              properties:
                estado: { type: string, enum: [en_revision, aceptado, rechazado] }
      responses:
        '200': { description: Postulación actualizada }
  /company/notifications:
    get:
      tags: [Empresa]
      summary: Notificaciones de la empresa
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: Notificaciones }
  /notifications:
    get:
      tags: [Notificaciones]
      summary: Notificaciones del postulante
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: Notificaciones }
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    User:
      type: object
      properties:
        id: { type: integer }
        role: { type: string, enum: [postulante, empresa, admin] }
        correo: { type: string, format: email }
        nombres: { type: string }
        apellidos: { type: string }
        nombre: { type: string }
    AuthResponse:
      type: object
      properties:
        accessToken: { type: string }
        user: { $ref: '#/components/schemas/User' }
    Vacancy:
      type: object
      properties:
        id: { type: integer }
        title: { type: string }
        company: { type: string }
        location: { type: string }
        type: { type: string }
        modality: { type: string }
        salary: { type: string }
        status: { type: string, enum: [Activa, Pausada, Cerrada, Pendiente] }
`

export const openapiDocument = parse(yaml) as Record<string, unknown>
