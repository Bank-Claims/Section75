# UK Banking Claims Lifecycle System

## Overview

This is a comprehensive claims management system specifically designed for UK banks to automate Section 75 credit card protection claims processing. The system handles the complete claims lifecycle from initial intake through manager assessment, featuring multimodal evidence processing, automated eligibility checking, and intelligent claim routing. Built as a full-stack web application, it provides separate interfaces for customer claim submission and manager review workflows, with automatic claim classification and status tracking throughout the process.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with React 18 and TypeScript, using a modern component-based architecture. The UI leverages shadcn/ui components with Radix UI primitives for consistent design and accessibility. Styling is implemented using Tailwind CSS with CSS custom properties for theming. Navigation is handled by wouter for lightweight client-side routing. State management utilizes TanStack Query for server state synchronization and React Hook Form for form handling with Zod validation.

### Backend Architecture
The server runs on Express.js with TypeScript in ESM module format. The API follows REST conventions with structured error handling and request logging middleware. The backend implements a service-oriented architecture with separate concerns for database operations, file storage, and business logic. Claims processing includes automated Section 75 eligibility checking based on UK banking regulations, with configurable rules for transaction validation and claim classification.

### Database Design
PostgreSQL serves as the primary database with Drizzle ORM for type-safe database operations. The schema includes users and claims tables with JSONB fields for flexible eligibility check storage and evidence file metadata. Claims are automatically assigned unique identifiers and timestamps, with status tracking throughout the lifecycle. The database uses Neon serverless PostgreSQL for scalability.

### File Storage and Evidence Processing
The system integrates with Google Cloud Storage for evidence file management, implementing object-level access control policies. Files are uploaded directly to cloud storage with metadata stored in the database. The ObjectUploader component uses Uppy for robust file upload handling with progress tracking and validation. Evidence files support multiple formats including documents, images, and PDFs.

### Authentication and Session Management
User authentication is handled through PostgreSQL session storage using connect-pg-simple. Sessions are managed server-side with secure cookie-based authentication. The system supports user registration and login workflows with password-based authentication.

### Business Logic Implementation
Claims processing implements UK Section 75 eligibility rules including transaction amount validation (£100-£30,000), time period checks (within 6 years), transaction type validation, and reason classification. Claims are automatically classified into four tiers based on monetary value. The system validates purchase methods, transaction types, and claim reasons according to UK banking regulations.

### Development and Build Configuration
The application uses Vite for development and build processes with hot module replacement in development. ESBuild handles server-side bundling for production deployment. TypeScript configuration supports both client and server code with proper module resolution. The development environment includes Replit-specific tooling for cloud development.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling and automatic scaling
- **Drizzle ORM**: Type-safe database operations with migration support

### Cloud Storage
- **Google Cloud Storage**: Object storage for evidence files with built-in access control
- **Replit Object Storage**: Development environment storage integration

### UI and Styling
- **Radix UI**: Accessible component primitives for form controls, dialogs, and navigation
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

### File Upload and Processing
- **Uppy**: Modular file uploader with dashboard UI and progress tracking
- **File type validation**: Support for PDF, images, and document formats

### Form and Data Management
- **React Hook Form**: Performant form handling with minimal re-renders
- **Zod**: Runtime type validation for forms and API data
- **TanStack Query**: Server state management with caching and synchronization

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds