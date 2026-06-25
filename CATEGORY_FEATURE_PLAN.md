# Plan: Site Category Feature

## Overview
Add a category system to the Sites table so stores can be grouped (e.g. New Shopify Store CA, 80 Store USA). No re-injection needed — purely database + dashboard UI changes.

---

## Database Changes

### 1. Add `categories` table
Store dynamic categories so new ones can be added from the dashboard without code changes.

```sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Seed with initial categories:
- `New Shopify Store (CA)`
- `80 Store (USA)`

### 2. Add `category_id` column to `sites` table
```sql
ALTER TABLE sites ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
```

---

## API Changes

### New endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create a new category |
| DELETE | `/api/categories/:id` | Delete a category |
| PATCH | `/api/sites/:id` | Already exists — extend to accept `categoryId` |
| POST | `/api/sites/bulk-assign-category` | Assign category to multiple sites at once |

---

## Dashboard UI Changes

### 1. Add Site Modal
Add a category dropdown below the domain input:
```
Domain:    [ verdunpeptides.ca          ]
Category:  [ New Shopify Store (CA)  ▼ ]
            > New Shopify Store (CA)
            > 80 Store (USA)
            > + Add new category...
```

- Dropdown lists all categories from DB
- Option to type and create a new category inline
- Category saved with the site on creation

---

### 2. Sites Table — Category Badge
Category shown as a small badge next to the domain name:

```
● verdunpeptides.ca   [CA Store]       48    333
● theannexpeptides.ca [CA Store]       45    154
● newyorkpeptides.com [USA Store]      12     89
● highparkpeptides.ca                  33    210   ← no category yet
```

---

### 3. Sites Table — Category Filter
New dropdown filter in the table header alongside existing filters:

```
[ All | Active | Inactive ]  [ All | Injected | Never injected ]  [ All Categories ▼ ]
```

Clicking **All Categories** opens dropdown to filter by a specific category.

---

### 4. Bulk Assign Feature
For assigning categories to the 560 existing stores without going one by one.

**How it works:**
1. Checkbox appears on hover on each row
2. Header checkbox = Select All on current page
3. Option appears to "Select all X results" when filtered
4. Selection bar appears at bottom when any row is selected:

```
┌──────────────────────────────────────────────────────┐
│  ☑ 560 selected   [ Assign category ▼ ]   [ Clear ]  │
└──────────────────────────────────────────────────────┘
```

5. Pick category → Click Assign → All selected stores updated instantly

---

### 5. Category Management (Settings or Admin)
Simple UI to add/edit/delete categories:
- List of existing categories
- Add new category (text input + save)
- Delete category (with confirmation)

---

## Implementation Order

1. Database migration — add `categories` table + `category_id` to `sites`
2. API endpoints — categories CRUD + bulk assign
3. Add Site modal — category dropdown
4. Sites table — category badge + filter
5. Bulk assign UI — checkboxes + selection bar
6. Category management UI

---

## Notes
- No re-injection needed
- No Cloudflare changes needed
- No script changes needed
- Existing 560 stores will have no category until bulk assigned
- Categories are dynamic — add new ones anytime from dashboard
