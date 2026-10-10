# User Flow: Smart Tourist Safety Monitoring & Incident Response System

## 1. End-to-End Primary Flow

```mermaid
flowchart TD
    A["Open application"] --> B{"Existing account?"}
    B -- No --> C["Register and provide required details"]
    B -- Yes --> D["Login"]
    C --> E["Verify account and set emergency contact"]
    E --> F["Issue Digital Tourist ID + QR"]
    D --> G["Open tourist home"]
    F --> G
    G --> H["Plan trip"]
    H --> I["Choose destination, dates, travelers, adventure and vehicle type"]
    I --> J["Fetch route, weather and available hazard information"]
    J --> K["Show route, safety tips and risk factors"]
    K --> L{"Start trip?"}
    L -- No --> H
    L -- Yes --> M["Request/confirm location permission"]
    M --> N["Begin location updates and monitoring"]
    N --> O["Check geo-fences and incoming safety alerts"]
    O --> P{"Potential danger or zone event?"}
    P -- No --> Q["Continue journey and periodic updates"]
    Q --> O
    P -- Yes --> R["Show alert, reason and suggested action"]
    R --> S{"Emergency?"}
    S -- No --> T["Reroute, leave zone, delay or acknowledge alert"]
    T --> O
    S -- Yes --> U["Tap SOS"]
    U --> V["Create SOS with timestamp, tourist ID and last available location"]
    V --> W["Notify emergency contacts and authorized responders"]
    W --> X["Responder accepts and updates rescue status"]
    X --> Y["Tourist/family sees permitted status updates"]
    Y --> Z{"Trip finished?"}
    Z -- No --> O
    Z -- Yes --> AA["Stop tracking and close trip"]
    AA --> AB["Save trip summary and incident history"]
```

## 2. Registration and Digital ID Flow

```mermaid
flowchart TD
    A["Select Register"] --> B["Enter name, age, contact and emergency details"]
    B --> C["Optional: add medical details, identity document and photo"]
    C --> D["Validate fields and obtain consent"]
    D --> E{"Valid and consented?"}
    E -- No --> B
    E -- Yes --> F["Create account/profile in Supabase"]
    F --> G["Generate public Tourist ID"]
    G --> H["Create QR pointing to verification endpoint"]
    H --> I["Submit minimal proof/hash to Polygon Amoy (prototype)"]
    I --> J["Show Digital Tourist ID and verification status"]
```

**Privacy rule:** personal documents, medical details, phone numbers, and exact location must remain off-chain. The QR should expose only a public identifier and verification endpoint; private details require authorized access.

## 3. Trip Planning and Safety Flow

```mermaid
flowchart TD
    A["Enter trip details"] --> B["Request route options"]
    B --> C["Load available weather, road, hazard and community reports"]
    C --> D["Assess risks and data freshness"]
    D --> E["Rank route options by safety and travel time"]
    E --> F["Show route, warnings, safety score/level and tips"]
    F --> G{"User decision"}
    G -- Start --> H["Enable trip monitoring"]
    G -- Change plan --> A
    G -- Cancel --> I["Return to home"]
```

Do not show a numeric safety score unless the scoring method is defined and tested. Clearly label unavailable or stale data.

## 4. Geo-Fence Event Flow

```mermaid
flowchart TD
    A["Receive permitted GPS update"] --> B["Check location accuracy and timestamp"]
    B --> C["Compare position with active zone geometry"]
    C --> D{"Zone event?"}
    D -- No --> E["Continue monitoring"]
    D -- Safe-zone exit --> F["Notify tourist: left planned safe zone"]
    D -- Restricted-zone entry --> G["Show urgent warning and recommended action"]
    F --> H["Record event"]
    G --> H
    H --> I["Notify authorized contacts only if configured/necessary"]
    I --> E
```

## 5. SOS and Rescue Response Flow

```mermaid
flowchart TD
    A["Tourist taps SOS"] --> B["Show quick confirmation / cancel accidental trigger"]
    B --> C["Capture timestamp and latest available GPS + accuracy"]
    C --> D["Create SOS record in backend"]
    D --> E["Notify emergency contacts and responder channel"]
    E --> F["Display call options for police / ambulance / rescue"]
    F --> G["Responder dashboard receives request"]
    G --> H["Responder accepts and assigns team"]
    H --> I["Team navigates using available map route"]
    I --> J["Update status: accepted, en route, reached, resolved"]
    J --> K["Notify tourist and permitted family contacts"]
    K --> L["Store audit trail and close incident"]
```

If connectivity is poor, retain the last known location and timestamp, clearly mark them as potentially stale, and expose direct phone-call options. Never imply that an alert was delivered until delivery is confirmed.

## 6. Incident Reporting and AI Vision Flow

```mermaid
flowchart TD
    A["Choose incident category or camera/report option"] --> B["Capture description and optional photo/video/audio"]
    B --> C["Attach location only with permission"]
    C --> D["Upload media to restricted storage"]
    D --> E["Create incident record"]
    E --> F["AI suggests category/risk when supported"]
    F --> G["User reviews and confirms details"]
    G --> H["Route to authorized authority/admin queue"]
    H --> I["Track status and send updates"]
```

AI output is a suggestion, not a confirmed diagnosis of the scene. Preserve the user's report and allow correction.

## 7. Family Dashboard Flow

```mermaid
flowchart TD
    A["Tourist opens sharing settings"] --> B["Choose family contact and permissions"]
    B --> C["Grant time-limited location sharing"]
    C --> D["Family signs in and is authorized"]
    D --> E["View permitted live/last-known location and status"]
    E --> F{"Consent still active?"}
    F -- Yes --> E
    F -- No --> G["Stop sharing and revoke access"]
```

## 8. Admin and Rescue Team Flows

### Admin
1. Sign in with an authorized admin role.
2. Review active trips, alerts, reports, and SOS requests.
3. Verify tourist ID proofs and service-provider records.
4. Manage geo-fence zones and publish authorized alerts.
5. Assign or monitor rescue teams where the system supports it.
6. Review aggregate analytics and audit events.

### Rescue team
1. Sign in and receive assigned SOS/incident requests.
2. Review location freshness, incident type, and only the emergency details required for response.
3. Accept the request and open navigation.
4. Update status as en route, reached, and resolved.
5. Add response notes and close the request.

## 9. Exception Paths to Test

- GPS permission denied or location accuracy is poor.
- Network unavailable, delayed push notifications, or stale weather/road data.
- Duplicate SOS taps or accidental SOS cancellation.
- QR code invalid, revoked, or blockchain testnet unavailable.
- Incident media upload fails.
- User exits a safe zone but GPS uncertainty makes the event ambiguous.
- Family access is revoked while a trip is active.
- No rescue team is available.
- AI classification confidence is low or wrong.

## 10. MVP User Journey Checklist

- [ ] Register/login and create a tourist profile.
- [ ] Display a QR-based digital tourist ID.
- [ ] Plan a trip and view route/weather/hazard information.
- [ ] Start and stop location monitoring with permission.
- [ ] Trigger and record geo-fence events.
- [ ] Send SOS and show delivery/response status accurately.
- [ ] Report an incident with optional media.
- [ ] Let an authorized responder update the case.
- [ ] View trip and incident history.
- [ ] Demonstrate a testnet proof without placing sensitive personal data on-chain.
