# **App Name**: LegisTrac

## Core Features:

- Secure User Authentication: Manages user login/logout and profiles with distinct roles (ADMIN/ASSESSOR) leveraging Firebase Authentication and Firestore, ensuring secure access to system features.
- Demand Creation & Management: Allows users to create new demands with essential fields (title, description, priority, deadline) and enables authorized users to update existing demand details.
- Demand Listing & Filtering: Provides intuitive lists of demands displaying key information like status, priority, and deadline, with powerful filtering capabilities such as 'My Demands' and 'All Demands' for ADMINs.
- Demand Workflow & Audit Trail: Facilitates demand processing through actions like sending, returning, finalizing (ADMIN-only), and reopening (ADMIN-only). Each action automatically creates an immutable 'trâmite' record for complete traceability and historical auditing.
- Internal Notification System: Generates and displays real-time, in-app notifications for relevant users concerning changes in demand status or responsibility. Includes unread indicators and direct links to specific demands.
- Demand Overview Dashboard: Provides a comprehensive dashboard displaying key metrics and statistics, including total open demands, overdue demands, demands per user, and those awaiting ADMIN review.
- AI-Powered Demand Summary Tool: Automatically generates concise summaries of lengthy demand descriptions, acting as a tool to assist users in quickly grasping the core content of complex requests.

## Style Guidelines:

- Primary color: A deep, authoritative blue (#16599C) to convey trust, professionalism, and stability in a political management context.
- Background color: A very light, desaturated blue-gray (#F3F5F7) provides a clean, focused, and non-distracting workspace conducive to administrative tasks.
- Accent color: A vibrant purple-blue (#5555F6) for interactive elements, calls to action, and highlighting important status indicators, offering a sophisticated contrast to the primary blue.
- Body and headline font: 'Inter', a modern grotesque sans-serif, is selected for its objective, neutral, and highly readable qualities, ensuring clarity across all text within the management system.
- Simple, functional, and consistent line-based icons will be used for actions, statuses, and navigation, prioritizing immediate recognition and utility over elaborate design.
- A clean, structured, and hierarchical layout with ample whitespace, utilizing grid-based displays for lists and clear content segmentation. Focus is on readability and efficient scanning of demand information.
- Subtle and smooth transitions for UI state changes, such as demand updates or notification appearances. Animations will be functional, providing gentle user feedback without being distracting.