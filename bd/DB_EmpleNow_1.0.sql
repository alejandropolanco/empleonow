-- ============================================================
-- EmpleNow - Esquema de Base de Datos (MySQL)
-- Generado a partir del diagrama entidad-relación (draw.io)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ============================================================
-- Tablas base (sin dependencias)
-- ============================================================

CREATE TABLE ADMIN (
    IDAdmin     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Correo      VARCHAR(150) NOT NULL UNIQUE,
    Contrasena  VARCHAR(255) NOT NULL,
    Estado      VARCHAR(20)  NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE EMPRESA (
    IDEmpresa       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre_Empresa  VARCHAR(150) NOT NULL,
    NIT             VARCHAR(20)  NOT NULL UNIQUE,
    telefono        VARCHAR(20),
    correo          VARCHAR(150) NOT NULL UNIQUE,
    contrasena      VARCHAR(255) NOT NULL,
    sector          VARCHAR(100),
    descripcion     TEXT,
    direccion       VARCHAR(200),
    Logo            VARCHAR(255),
    Estado          VARCHAR(20)  NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE CV (
    ID_CV   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Archivo VARCHAR(255) NOT NULL,
    nombre  VARCHAR(150)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE CERTIFICADO (
    id_certificado  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    archivo         VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE EXPERIENCIA (
    IdExperiencia    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cargo            VARCHAR(150) NOT NULL,
    empresaAnterior  VARCHAR(150),
    Descripcion      TEXT,
    fecha_inicio     DATE,
    Fecha_fin        DATE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POSTULANTE (depende de CV, CERTIFICADO, EXPERIENCIA)
-- ============================================================

CREATE TABLE POSTULANTE (
    IdPostulante    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Nombres         VARCHAR(100) NOT NULL,
    Apellidos       VARCHAR(100) NOT NULL,
    Correo          VARCHAR(150) NOT NULL UNIQUE,
    Contrasena      VARCHAR(255) NOT NULL,
    telefono        VARCHAR(20),
    foto            VARCHAR(255),
    ubicacion       VARCHAR(200),
    Estado          VARCHAR(20)  NOT NULL DEFAULT 'activo',
    Fecha_Nacimiento DATE,
    Fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_cv           INT UNSIGNED,
    id_experiencia  INT UNSIGNED,
    id_certificado  INT UNSIGNED,
    CONSTRAINT fk_postulante_cv
        FOREIGN KEY (id_cv) REFERENCES CV(ID_CV)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_postulante_experiencia
        FOREIGN KEY (id_experiencia) REFERENCES EXPERIENCIA(IdExperiencia)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_postulante_certificado
        FOREIGN KEY (id_certificado) REFERENCES CERTIFICADO(id_certificado)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Tablas dependientes de POSTULANTE
-- ============================================================

CREATE TABLE FORMACION (
    IdFormacion     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    titulo          VARCHAR(150) NOT NULL,
    institucion     VARCHAR(150),
    nivelEstudio    VARCHAR(100),
    fecha_inicio    DATE,
    fecha_Grado     DATE,
    id_postulante   INT UNSIGNED NOT NULL,
    CONSTRAINT fk_formacion_postulante
        FOREIGN KEY (id_postulante) REFERENCES POSTULANTE(IdPostulante)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE HABILIDAD (
    idHabil         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    tipo            VARCHAR(50),
    id_postulante   INT UNSIGNED NOT NULL,
    CONSTRAINT fk_habilidad_postulante
        FOREIGN KEY (id_postulante) REFERENCES POSTULANTE(IdPostulante)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE POSTULACION (
    IdPostulacion           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Titulo_de_postulacion   VARCHAR(150) NOT NULL,
    Descripcion_postulacion TEXT,
    Cargo_solicitado        VARCHAR(150),
    estado                  VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    Fecha_creacion          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_postulante           INT UNSIGNED NOT NULL,
    CONSTRAINT fk_postulacion_postulante
        FOREIGN KEY (id_postulante) REFERENCES POSTULANTE(IdPostulante)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE POST_VAC_FAV (
    id_pos_vac_fav  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fec_guardado    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notas           TEXT,
    id_postulacion  INT UNSIGNED NOT NULL,
    CONSTRAINT fk_postvacfav_postulacion
        FOREIGN KEY (id_postulacion) REFERENCES POSTULACION(IdPostulacion)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- VACANTE y CATEGORIA
-- ============================================================

CREATE TABLE VACANTE (
    IDvacantes          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cargo                VARCHAR(150) NOT NULL,
    departamento         VARCHAR(100),
    descripcion          TEXT,
    requisitos           TEXT,
    beneficios           TEXT,
    ubicacion            VARCHAR(200),
    salario              DECIMAL(10,2),
    modalidad            VARCHAR(50),
    tipoDeEmpleo         VARCHAR(50),
    tipoContrato         VARCHAR(50),
    descripcionContrato  TEXT,
    Fecha_contrato       DATE,
    Fecha_limite         DATE,
    Fecha_Publicacion    DATE NOT NULL DEFAULT (CURRENT_DATE),
    Estado               VARCHAR(20) NOT NULL DEFAULT 'activo',
    id_empresa           INT UNSIGNED NOT NULL,
    id_post_vac_fav      INT UNSIGNED,
    CONSTRAINT fk_vacante_empresa
        FOREIGN KEY (id_empresa) REFERENCES EMPRESA(IDEmpresa)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_vacante_postvacfav
        FOREIGN KEY (id_post_vac_fav) REFERENCES POST_VAC_FAV(id_pos_vac_fav)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE CATEGORIA (
    IDCategoria  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  TEXT,
    vacante      INT UNSIGNED NOT NULL,
    CONSTRAINT fk_categoria_vacante
        FOREIGN KEY (vacante) REFERENCES VACANTE(IDvacantes)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Verificación de documentos
-- ============================================================

CREATE TABLE DOCUMENTOVERIFICACION (
    id_docver      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    archivo        VARCHAR(255) NOT NULL,
    fechadecarga   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IDAdmin        INT UNSIGNED,
    id_empresa     INT UNSIGNED NOT NULL,
    CONSTRAINT fk_docver_admin
        FOREIGN KEY (IDAdmin) REFERENCES ADMIN(IDAdmin)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_docver_empresa
        FOREIGN KEY (id_empresa) REFERENCES EMPRESA(IDEmpresa)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Notificaciones (entidad general + subtipos por destinatario)
-- ============================================================

CREATE TABLE NOTIFICACION (
    id_not              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo                VARCHAR(50),
    tipo_destinatario   VARCHAR(50),
    mensaje             TEXT NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'no_leida',
    id_admin            INT UNSIGNED,
    CONSTRAINT fk_notificacion_admin
        FOREIGN KEY (id_admin) REFERENCES ADMIN(IDAdmin)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE NOTIFICACION_POSTULANTE (
    id_not          INT UNSIGNED NOT NULL,
    id_postulante   INT UNSIGNED NOT NULL,
    fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mensaje         TEXT,
    estado          VARCHAR(20) NOT NULL DEFAULT 'no_leida',
    PRIMARY KEY (id_not, id_postulante),
    CONSTRAINT fk_notpost_notificacion
        FOREIGN KEY (id_not) REFERENCES NOTIFICACION(id_not)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notpost_postulante
        FOREIGN KEY (id_postulante) REFERENCES POSTULANTE(IdPostulante)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE NOTIFICACION_EMPRESA (
    id_not      INT UNSIGNED NOT NULL,
    id_empresa  INT UNSIGNED NOT NULL,
    fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mensaje     TEXT,
    estado      VARCHAR(20) NOT NULL DEFAULT 'no_leida',
    PRIMARY KEY (id_not, id_empresa),
    CONSTRAINT fk_notemp_notificacion
        FOREIGN KEY (id_not) REFERENCES NOTIFICACION(id_not)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notemp_empresa
        FOREIGN KEY (id_empresa) REFERENCES EMPRESA(IDEmpresa)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE NOTIFICACION_ADMIN (
    id_not              INT UNSIGNED NOT NULL,
    IDAdmin             INT UNSIGNED NOT NULL,
    tipo                VARCHAR(50),
    tipo_destinatario   VARCHAR(50),
    mensaje             TEXT,
    estado              VARCHAR(20) NOT NULL DEFAULT 'no_leida',
    PRIMARY KEY (id_not, IDAdmin),
    CONSTRAINT fk_notadmin_notificacion
        FOREIGN KEY (id_not) REFERENCES NOTIFICACION(id_not)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notadmin_admin
        FOREIGN KEY (IDAdmin) REFERENCES ADMIN(IDAdmin)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
