# 🔔 Notification System Integration Guide

## Overview
A comprehensive notification badge system has been integrated into all three dashboards (Admin, Trainer, and Client). The system shows real-time notification counters on navigation items and automatically clears them when the user views the corresponding section.

## Features
- ✅ Animated notification badges with pulsing effect
- ✅ Persistent storage (survives page refresh)
- ✅ Auto-clear on panel view
- ✅ Light/Dark mode support
- ✅ 99+ overflow handling
- ✅ Exposed API for BackendMain.js integration

---

## Client Dashboard Notifications

### Available Notification Types:
- **messenger** - New messages from trainer
- **workouts** - New workout plans from trainer
- **meals** - New meal plans from trainer
- **booking** - New class bookings/updates
- **trainer** - New trainer invitations/updates
- **cart** - Cart updates

### Usage Example:
```javascript
// Add a notification
window.XGymNotifications.addNotification('messenger', 1);
window.XGymNotifications.addNotification('workouts', 1);
window.XGymNotifications.addNotification('meals', 2);

// Clear a notification
window.XGymNotifications.clearNotification('messenger');

// Get current count
const messengerCount = window.XGymNotifications.notifications.messenger;
```

---

## Trainer Dashboard Notifications

### Available Notification Types:
- **messenger** - New messages from clients
- **clients** - Client progress updates/requests
- **classes** - New class enrollments/updates

### Usage Example:
```javascript
// When a client sends a message
window.XGymNotifications.addNotification('messenger', 1);

// When a client updates their progress
window.XGymNotifications.addNotification('clients', 1);

// When someone enrolls in a class
window.XGymNotifications.addNotification('classes', 1);
```

---

## Admin Dashboard Notifications

### Available Notification Types:
- **messenger** - New messages
- **members** - New member registrations
- **memberships** - New membership requests
- **trainer-links** - New trainer-client link requests

### Usage Example:
```javascript
// When a new member registers
window.XGymNotifications.addNotification('members', 1);

// When a new membership is requested
window.XGymNotifications.addNotification('memberships', 1);

// When a trainer-client link is requested
window.XGymNotifications.addNotification('trainer-links', 1);
```

---

## Integration with BackendMain.js

### Firebase Real-time Updates
```javascript
// Example: Listen for new messages
firebase.database().ref('messages/' + userId).on('child_added', (snapshot) => {
    const message = snapshot.val();
    if (!message.read) {
        // Trigger notification
        if (window.XGymNotifications) {
            window.XGymNotifications.addNotification('messenger', 1);
        }
    }
});

// Example: Listen for new workout plans (Client)
firebase.database().ref('workouts/' + clientId).on('child_added', (snapshot) => {
    const workout = snapshot.val();
    if (workout.status === 'new') {
        if (window.XGymNotifications) {
            window.XGymNotifications.addNotification('workouts', 1);
        }
    }
});

// Example: Listen for client updates (Trainer)
firebase.database().ref('clients/' + trainerId).on('child_changed', (snapshot) => {
    if (window.XGymNotifications) {
        window.XGymNotifications.addNotification('clients', 1);
    }
});
```

### Clear Notifications on Read
```javascript
// When a message is read
function markMessageAsRead(messageId) {
    firebase.database().ref('messages/' + messageId).update({
        read: true
    }).then(() => {
        // Notification is auto-cleared when panel is opened
        // Or manually clear:
        // window.XGymNotifications.clearNotification('messenger');
    });
}

// When a workout plan is viewed
function viewWorkout(workoutId) {
    firebase.database().ref('workouts/' + workoutId).update({
        status: 'viewed'
    });
    // Auto-cleared by panel listener
}
```

---

## Auto-Clear Behavior

Notifications automatically clear when:
1. User clicks on the corresponding navigation item
2. The panel is displayed (500ms delay for smooth UX)

The mapping is handled automatically:
```javascript
// Client Dashboard
'panel-messenger' → clears 'messenger' notification
'panel-workouts' → clears 'workouts' notification
'panel-meals' → clears 'meals' notification
// etc.

// Trainer Dashboard
'panel-messenger' → clears 'messenger' notification
'panel-clients' → clears 'clients' notification
// etc.

// Admin Dashboard
'panel-messenger' → clears 'messenger' notification
'panel-members' → clears 'members' notification
// etc.
```

---

## Storage

Notifications are stored in localStorage:
- **Client**: `xgym-client-notifications`
- **Trainer**: `xgym-trainer-notifications`
- **Admin**: `xgym-admin-notifications`

This ensures notifications persist across page refreshes.

---

## Demo Mode

All dashboards include simulated notifications for testing:
- Notifications appear automatically after page load
- Check browser console for notification events
- Remove `simulateIncomingNotifications()` calls in production

**To disable demo mode:**
Comment out or remove this line in each dashboard's notification script:
```javascript
// this.simulateIncomingNotifications(); // Demo purposes
```

---

## API Reference

### Methods

#### `addNotification(type, count)`
Add notifications of a specific type.
- **type**: String - notification type (e.g., 'messenger', 'workouts')
- **count**: Number - number to add (default: 1)

#### `clearNotification(type)`
Clear all notifications of a specific type.
- **type**: String - notification type to clear

#### `updateBadge(type)`
Manually update a badge display.
- **type**: String - notification type to update

#### `updateAllBadges()`
Refresh all badge displays.

### Properties

#### `notifications`
Object containing current notification counts.
```javascript
{
    messenger: 3,
    workouts: 1,
    meals: 0,
    // etc.
}
```

---

## Styling Customization

The notification badges use CSS variables and can be customized:

```css
.notification-badge {
    background: linear-gradient(135deg, var(--fire), #ff6b47);
    min-width: 20px;
    height: 20px;
    font-size: 0.7rem;
    /* Customize as needed */
}
```

Pulsing animation can be adjusted:
```css
@keyframes notifPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}
```

---

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

---

## Troubleshooting

### Notifications not appearing?
1. Check browser console for errors
2. Verify `window.XGymNotifications` is available
3. Ensure notification type matches available types

### Notifications not clearing?
1. Verify panel `data-panel` attribute matches mapping
2. Check that setTimeout delay is appropriate
3. Confirm panel click event is firing

### Counts not persisting?
1. Check localStorage is enabled
2. Verify storage key is correct for dashboard type
3. Check browser privacy settings

---

## Next Steps

1. Remove demo simulation code from production
2. Integrate with Firebase real-time database
3. Add notification sounds (optional)
4. Add push notifications for mobile (optional)
5. Implement notification history/log (optional)

---

## Support

For issues or questions about the notification system, check:
- Browser console for error messages
- localStorage data for persistence issues
- Network tab for Firebase connection issues
