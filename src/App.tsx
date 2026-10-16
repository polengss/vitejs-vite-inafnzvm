import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import './App.css';

type Status = 'Lost' | 'Found' | 'Returned';

type Item = {
  id: string;
  name: string;
  category: string;
  location: string;
  date: string;
  status: Status;
  icon: string;
  image?: string;
  ownerId: string;
};

type ItemForm = {
  name: string;
  category: string;
  location: string;
  status: Status;
};

type Conversation = {
  id: string;
  itemId: string;
  reporterId: string;
  contactId: string;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

const categories = [
  'Accessories',
  'Documents',
  'Electronics',
  'Clothing',
  'Other',
];

const emptyForm: ItemForm = {
  name: '',
  category: 'Accessories',
  location: '',
  status: 'Lost',
};

function formatDate(date: string) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function categoryIcon(category: string) {
  const icons: Record<string, string> = {
    Accessories: '🎒',
    Documents: '📄',
    Electronics: '📱',
    Clothing: '👕',
    Other: '📦',
  };

  return icons[category] || '📦';
}

function getUsername(user: User | null) {
  if (!user) return 'Guest';

  const metadata = user.user_metadata || {};
  const username = metadata.username || metadata.full_name || metadata.name;

  if (typeof username === 'string' && username.trim()) {
    return username.trim();
  }

  return user.email?.split('@')[0] || 'User';
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [photo, setPhoto] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState('');
  // Private messaging
  const [showMessages, setShowMessages] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  async function loadItems() {
    setLoadingItems(true);

    const { data, error } = await supabase
      .from('items')
      .select(
        'id, name, category, location, date, status, icon, image_url, owner_id'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading items:', error);
      setErrorMessage(
        `Supabase error: ${error.message} (Code: ${error.code ?? 'unknown'})`
      );
      setLoadingItems(false);
      return;
    }

    const mappedItems: Item[] = (data || []).map((row) => ({
      id: String(row.id),
      name: row.name || 'Unnamed item',
      category: row.category || 'Other',
      location: row.location || '',
      date: row.date || '',
      status: row.status as Status,
      icon: row.icon || categoryIcon(row.category || 'Other'),
      image: row.image_url || '',
      ownerId: row.owner_id || '',
    }));

    setItems(mappedItems);
    setLoadingItems(false);
  }

  async function loadConversations() {
    if (!user) return;

    setLoadingConversations(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, item_id, reporter_id, contact_id, created_at')
        .or(`reporter_id.eq.${user.id},contact_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Conversation[] = (data || []).map((row) => ({
        id: String(row.id),
        itemId: String(row.item_id),
        reporterId: row.reporter_id,
        contactId: row.contact_id,
        createdAt: row.created_at,
      }));

      setConversations(mapped);
    } catch (error) {
      console.error('Error loading conversations:', error);
      showError(
        error instanceof Error
          ? error.message
          : 'Unable to load your conversations.'
      );
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadChatMessages(conversationId: string) {
    setLoadingMessages(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .eq('conversation_id', Number(conversationId))
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: ChatMessage[] = (data || []).map((row) => ({
        id: String(row.id),
        conversationId: String(row.conversation_id),
        senderId: row.sender_id,
        body: row.body,
        createdAt: row.created_at,
      }));

      setChatMessages(mapped);
    } catch (error) {
      console.error('Error loading messages:', error);
      showError(
        error instanceof Error ? error.message : 'Unable to load messages.'
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  async function openConversation(conversation: Conversation) {
    setActiveConversation(conversation);
    setChatMessages([]);
    setNewMessage('');
    setShowMessages(true);

    await loadChatMessages(conversation.id);
  }

  async function startConversation(item: Item) {
    if (!user) {
      openAuth('signin');
      showNotice(
        'Please sign in to message the person who reported this item.'
      );
      return;
    }

    if (!item.ownerId || item.ownerId === user.id) {
      showError('You cannot start a conversation with yourself.');
      return;
    }

    setMessage('');
    setErrorMessage('');

    try {
      // Reuse an existing conversation for this item and contact.
      const { data: existing, error: lookupError } = await supabase
        .from('conversations')
        .select('id, item_id, reporter_id, contact_id, created_at')
        .eq('item_id', Number(item.id))
        .eq('contact_id', user.id)
        .maybeSingle();

      if (lookupError) throw lookupError;

      let conversation: Conversation;

      if (existing) {
        conversation = {
          id: String(existing.id),
          itemId: String(existing.item_id),
          reporterId: existing.reporter_id,
          contactId: existing.contact_id,
          createdAt: existing.created_at,
        };
      } else {
        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({
            item_id: Number(item.id),
            reporter_id: item.ownerId,
            contact_id: user.id,
          })
          .select('id, item_id, reporter_id, contact_id, created_at')
          .single();

        if (createError) {
          // If another request created it at the same time, try retrieving it.
          if (createError.code === '23505') {
            const { data: retry, error: retryError } = await supabase
              .from('conversations')
              .select('id, item_id, reporter_id, contact_id, created_at')
              .eq('item_id', Number(item.id))
              .eq('contact_id', user.id)
              .single();

            if (retryError) throw retryError;

            conversation = {
              id: String(retry.id),
              itemId: String(retry.item_id),
              reporterId: retry.reporter_id,
              contactId: retry.contact_id,
              createdAt: retry.created_at,
            };
          } else {
            throw createError;
          }
        } else {
          conversation = {
            id: String(created.id),
            itemId: String(created.item_id),
            reporterId: created.reporter_id,
            contactId: created.contact_id,
            createdAt: created.created_at,
          };
        }
      }

      await loadConversations();
      await openConversation(conversation);
    } catch (error) {
      console.error('Error starting conversation:', error);
      showError(
        error instanceof Error
          ? error.message
          : 'Unable to start a conversation. Please try again.'
      );
    }
  }

  async function sendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = newMessage.trim();

    if (!user || !activeConversation || !body || sendingMessage) return;

    setSendingMessage(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: Number(activeConversation.id),
        sender_id: user.id,
        body,
      });

      if (error) throw error;

      setNewMessage('');
      await loadChatMessages(activeConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
      showError(
        error instanceof Error ? error.message : 'Unable to send your message.'
      );
    } finally {
      setSendingMessage(false);
    }
  }

  function openMessagesInbox() {
    if (!user) {
      openAuth('signin');
      showNotice('Please sign in to view your messages.');
      return;
    }

    setActiveConversation(null);
    setChatMessages([]);
    setShowProfile(false);
    setShowMessages(true);
    void loadConversations();
  }

  useEffect(() => {
    void loadItems();

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      void loadConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setChatMessages([]);
      setShowMessages(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      // Close the authentication modal
      setShowAuth(false);
      setShowPassword(false);

      // Close the report/edit modal
      if (!isSaving) {
        setShowForm(false);
      }

      // Close the messages modal
      setShowMessages(false);
      setActiveConversation(null);

      // Close the photo preview
      setSelectedPhoto('');
    };

    window.addEventListener('keydown', handleEscapeKey);

    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isSaving]);

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === 'All' || item.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  function showNotice(text: string) {
    setShowWelcomeModal(false);
    setMessage(text);
    setErrorMessage('');
  }

  function showError(text: string) {
    setShowWelcomeModal(false);
    setErrorMessage(text);
    setMessage('');
  }

  function openAuth(mode: 'signin' | 'signup' = 'signin') {
    setShowPassword(false);
    setAuthMode(mode);
    setAuthUsername('');
    setAuthEmail('');
    setAuthPassword('');
    setShowProfile(false);
    setShowAuth(true);
    setMessage('');
    setErrorMessage('');
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAuthLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      if (authMode === 'signup') {
        if (!authUsername.trim()) {
          showError('Please enter a username.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              username: authUsername.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setUser(data.user);
          setShowAuth(false);
          showNotice(`Welcome to FindIt, ${getUsername(data.user)}!`);
        } else {
          setShowAuth(false);
          showNotice(
            'Account created. If email confirmation is enabled, follow the instructions sent to your email before signing in.'
          );
        }
      } else {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: authEmail.trim(),
              password: authPassword,
            });
            
            if (error) throw error;
            
            if (!data.user) {
              throw new Error('No user information was returned after sign-in.');
            }
            
            const welcomeKey = `findit-welcome-shown-${data.user.id}`;
            const alreadyShown = sessionStorage.getItem(welcomeKey);
            
            if (!alreadyShown) {
              setShowWelcomeModal(true);
              sessionStorage.setItem(welcomeKey, 'true');
            }
            
            setUser(data.user);
            setShowAuth(false);
            showNotice(`Welcome back, ${getUsername(data.user)}!`);
      }
    } catch (error) {
      const text =
        error instanceof Error ? error.message : 'Authentication failed.';
      showError(text);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (user) {
      sessionStorage.removeItem(`findit-welcome-shown-${user.id}`);
    }

    setShowWelcomeModal(false);
    if (error) {
      showError(error.message);
      return;
    }

    setUser(null);
    setShowProfile(false);
    showNotice('You have signed out.');
  }

  function openReportForm() {
    if (!user) {
      openAuth('signin');
      showNotice('Please sign in before reporting an item.');
      return;
    }

    setForm(emptyForm);
    setPhoto('');
    setPhotoFile(null);
    setPhotoError('');
    setEditingItem(null);
    setShowForm(true);
    setMessage('');
    setErrorMessage('');
  }

  function openEditForm(item: Item) {
    if (!user || item.ownerId !== user.id) {
      showError('You can only edit items you reported.');
      return;
    }

    setForm({
      name: item.name,
      category: item.category,
      location: item.location,
      status: item.status,
    });

    setPhoto(item.image || '');
    setPhotoFile(null);
    setPhotoError('');
    setEditingItem(item);
    setShowForm(true);
    setMessage('');
    setErrorMessage('');
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setPhotoError('Image must be 3 MB or smaller.');
      event.target.value = '';
      return;
    }

    setPhotoError('');
    setPhotoFile(file);

    const reader = new FileReader();

    reader.onload = () => {
      setPhoto(String(reader.result || ''));
    };

    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      showError('Please sign in before submitting a report.');
      return;
    }

    setIsSaving(true);
    setMessage('');
    setErrorMessage('');

    let currentStep = 'Preparing report';

    try {
      let imageUrl = editingItem?.image || '';

      if (photoFile) {
        currentStep = 'Uploading photo';

        const filePath = `${user.id}/${Date.now()}-${photoFile.name}`;

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log('Photo upload diagnostic:', {
          appUserId: user.id,
          sessionUserId: session?.user.id,
          sessionError,
          filePath,
        });

        const { error: uploadError } = await supabase.storage
          .from('item-photos')
          .upload(filePath, photoFile, {
            upsert: false,
            contentType: photoFile.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('item-photos')
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      console.log('Current user ID:', user?.id);
      console.log('Item owner ID:', user.id);

      const itemData = {
        name: form.name.trim(),
        category: form.category,
        location: form.location.trim(),
        status: form.status,
        icon: categoryIcon(form.category),
        image_url: imageUrl || null,
        owner_id: user.id,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(itemData)
          .eq('id', editingItem.id)
          .eq('owner_id', user.id);

        if (error) throw error;

        showNotice('Your item report has been updated.');
      } else {
        currentStep = 'Saving item to database';

        const { error } = await supabase.from('items').insert({
          ...itemData,
          date: new Date().toISOString().slice(0, 10),
        });

        if (error) throw error;

        showNotice('Your item has been reported successfully.');
      }

      setShowForm(false);
      setEditingItem(null);
      setForm(emptyForm);
      setPhoto('');
      setPhotoFile(null);

      await loadItems();

      document.getElementById('items-list')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } catch (error) {
      console.error(`FindIt error during: ${currentStep}`, error);

      const details =
        error instanceof Error ? error.message : JSON.stringify(error);

      showError(`${currentStep} failed: ${details}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateItemStatus(item: Item, status: Status) {
    if (!user || item.ownerId !== user.id) {
      showError(
        'Only the person who reported this item can change its status.'
      );
      return;
    }

    const { error } = await supabase
      .from('items')
      .update({ status })
      .eq('id', item.id)
      .eq('owner_id', user.id);

    if (error) {
      showError(error.message);
      return;
    }

    showNotice('Item status updated.');
    await loadItems();
  }

  async function deleteItem(item: Item) {
    if (!user || item.ownerId !== user.id) {
      showError('You can only delete items you reported.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', item.id)
      .eq('owner_id', user.id);

    if (error) {
      showError(error.message);
      return;
    }

    setItems((currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id)
    );

    showNotice('Your item report has been deleted.');
  }

  function scrollToItems() {
    document.getElementById('items-list')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <a
          className="brand"
          href="#top"
          aria-label="FindIt home"
          onClick={() => {
            setShowProfile(false);
            setShowAuth(false);
          }}
        >
          <span className="brand-mark">F</span>
          <span className="brand-copy">
            <span className="brand-name">FindIt</span>
            <span className="brand-tagline">CAMPUS LOST AND FOUND</span>
          </span>
        </a>

        
        <div className="navbar-actions">
          <button
            type="button"
            className={`nav-action-button expandable-action ${
              showSearch ? 'nav-action-active' : ''
            }`}
            onClick={() => {
              setShowSearch((current) => !current);
              setShowProfile(false);
            }}
            aria-label="Search"
          >
            <span className="expandable-icon" aria-hidden="true">⌕</span>
            <span className="expandable-label">Search</span>
          </button>
        
          <button
            type="button"
            className="nav-action-button expandable-action nav-report-button"
            onClick={openReportForm}
            aria-label="Report item"
          >
            <span className="expandable-icon" aria-hidden="true">＋</span>
            <span className="expandable-label">Report</span>
          </button>
        
          <div className="profile-wrapper">
            <button
              type="button"
              className={`profile-button expandable-action ${
                showProfile ? 'profile-active' : ''
              }`}
              onClick={() => {
                setShowProfile((current) => !current);
                setShowSearch(false);
              }}
              aria-expanded={showProfile}
              aria-label="Account"
            >
              <span className="profile-avatar" aria-hidden="true">
                {user ? getUsername(user).charAt(0).toUpperCase() : '👤'}
              </span>
              <span className="expandable-label">Account</span>
            </button>
        
            {showProfile && (
              <div className="profile-dropdown">
                {user ? (
                  <>
                    <div className="profile-details">
                      <span className="profile-name">{getUsername(user)}</span>
                      <span className="profile-email">{user.email}</span>
                    </div>
        
                    <button
                      type="button"
                      className="dropdown-action"
                      onClick={() => {
                        setShowProfile(false);
                        scrollToItems();
                      }}
                    >
                      Browse items
                    </button>
        
                    <button
                      type="button"
                      className="dropdown-action signout-action"
                      onClick={() => void handleSignOut()}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="profile-details">
                      <span className="profile-name">Welcome to FindIt</span>
                      <span className="profile-email">
                        Sign in to report and manage items.
                      </span>
                    </div>
        
                    <button
                      type="button"
                      className="dropdown-action"
                      onClick={() => openAuth('signin')}
                    >
                      Sign in
                    </button>
        
                    <button
                      type="button"
                      className="dropdown-action dropdown-primary"
                      onClick={() => openAuth('signup')}
                    >
                      Create account
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>


      {showSearch && (
        <div className="navbar-search-panel">
          <form
            className="search-bar"
            onSubmit={(event) => {
              event.preventDefault();
              setShowSearch(false);
              scrollToItems();
            }}
          >
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>

            <input
              type="search"
              placeholder="Search items, categories, or locations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search items"
              autoFocus
            />

            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}

            <button type="submit" className="search-submit">
              Search
            </button>
          </form>
        </div>
      )}

      <main id="top">
        <section className="welcome-section">
          <div className="top-actions">
            <form
              className="search-bar"
              onSubmit={(event) => {
                event.preventDefault();
                scrollToItems();
              }}
            >
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                placeholder="Search for an item, category, or location..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search items"
              />
              {search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
              <button type="submit" className="search-submit">
                Search
              </button>
            </form>

            <button
              type="button"
              className="report-button"
              onClick={openReportForm}
            >
              <span aria-hidden="true">＋</span>
              Report an item
            </button>
          </div>
        </section>

        <section className="items-section" id="items-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CAMPUS COMMUNITY</span>
              <h2>Browse items</h2>
              <p>Explore reported lost and found belongings.</p>
            </div>
            <span className="item-count">
              {filteredItems.length}{' '}
              {filteredItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="filter-panel">
            <div className="filter-group">
              <label htmlFor="category-filter">Category</label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="All">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
                <option value="Returned">Returned</option>
              </select>
            </div>

            {(search || categoryFilter !== 'All' || statusFilter !== 'All') && (
              <button
                type="button"
                className="reset-filters"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('All');
                  setStatusFilter('All');
                }}
              >
                Reset filters
              </button>
            )}
          </div>

          {loadingItems ? (
            <div className="empty-state">
              <span className="loading-spinner" />
              <p>Loading campus items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">⌕</span>
              <h3>No items found</h3>
              <p>
                Try another search or change your filters to see more items.
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('All');
                  setStatusFilter('All');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="items-grid">
              {filteredItems.map((item) => {
                const isOwner = Boolean(user && user.id === item.ownerId);

                return (
                  <article className="item-card" key={item.id}>
                    <button
                      type="button"
                      className={`item-image ${item.image ? 'has-image' : ''}`}
                      onClick={() => {
                        if (item.image) setSelectedPhoto(item.image);
                      }}
                      disabled={!item.image}
                      aria-label={
                        item.image
                          ? `View photo of ${item.name}`
                          : `No photo for ${item.name}`
                      }
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <span className="item-placeholder">
                          {item.icon || categoryIcon(item.category)}
                        </span>
                      )}
                      <span
                        className={`status-badge status-${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </button>

                    <div className="item-card-body">
                      <div className="item-category">{item.category}</div>
                      <h3>{item.name}</h3>

                      <div className="item-meta">
                        <span>
                          ⌖ {item.location || 'Location not specified'}
                        </span>
                        <span>▦ {formatDate(item.date)}</span>
                      </div>

                      {isOwner && (
                        <div className="owner-controls">
                          <button
                            type="button"
                            className="edit-item-button"
                            onClick={() => openEditForm(item)}
                          >
                            Edit report
                          </button>

                          <button
                            type="button"
                            className="delete-item-button"
                            onClick={() => void deleteItem(item)}
                          >
                            Delete report
                          </button>

                          {item.status !== 'Returned' && (
                            <button
                              type="button"
                              className="mark-returned-button"
                              onClick={() =>
                                void updateItemStatus(item, 'Returned')
                              }
                            >
                              Mark returned
                            </button>
                          )}
                        </div>
                      )}

                      {user && !isOwner && item.ownerId && (
                        <button
                          type="button"
                          className="message-reporter-button"
                          onClick={() => void startConversation(item)}
                        >
                          Message Reporter
                        </button>
                      )}

                      {!user && item.ownerId && (
                        <button
                          type="button"
                          className="message-reporter-button"
                          onClick={() => {
                            openAuth('signin');
                            showNotice(
                              'Please sign in to message the reporter.'
                            );
                          }}
                        >
                          Sign in to message
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <a className="footer-brand" href="#top">
          FindIt
        </a>
        <p>Helping campus belongings find their way home.</p>
        <span>Campus Lost and Found</span>
      </footer>

      <button
        type="button"
        className="floating-messages-button"
        onClick={openMessagesInbox}
        aria-label="Open messages"
        title="Messages"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
        </svg>

        {user && conversations.length > 0 && (
          <span className="floating-messages-count">
            {conversations.length > 9 ? '9+' : conversations.length}
          </span>
        )}
      </button>

      {showWelcomeModal && !message && !errorMessage && (
        <div
          className="modal-backdrop welcome-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowWelcomeModal(false);
            }
          }}
        >
          <section
            className="modal-card welcome-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-popup-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowWelcomeModal(false)}
              aria-label="Close welcome message"
            >
              ×
            </button>

            <div className="welcome-popup-icon">⌕</div>
            <span className="eyebrow">YOUR CAMPUS LOST-AND-FOUND HUB</span>

            <h2 id="welcome-popup-title">Welcome to FindIt!</h2>

            <p className="modal-description">
              Lost something on campus? Looking for an item someone found?
              FindIt helps you reconnect with your belongings.
            </p>

            {!user && (
              <button
                type="button"
                className="auth-submit"
                onClick={() => {
                  setShowWelcomeModal(false);
                  openAuth('signup');
                }}
              >
                Create an account
              </button>
            )}

            <button
              type="button"
              className="welcome-dismiss-button"
              onClick={() => setShowWelcomeModal(false)}
            >
              Browse items
            </button>
          </section>
        </div>
      )}

      {(message || errorMessage) && !showWelcomeModal && (
        <div
          className="modal-backdrop notice-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMessage('');
              setErrorMessage('');
            }
          }}
        >
          <section
            className={`modal-card notice-modal ${
              errorMessage ? 'notice-modal-error' : 'notice-modal-success'
            }`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notice-modal-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setMessage('');
                setErrorMessage('');
              }}
              aria-label="Close notice"
            >
              ×
            </button>

            <div className="notice-modal-icon">{errorMessage ? '!' : '✓'}</div>

            <h2 id="notice-modal-title">
              {errorMessage ? 'Something went wrong' : 'Notice'}
            </h2>

            <p className="modal-description">{errorMessage || message}</p>

            <button
              type="button"
              className="auth-submit"
              onClick={() => {
                setMessage('');
                setErrorMessage('');
              }}
            >
              Okay
            </button>
          </section>
        </div>
      )}

      {showAuth && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAuth(false);
          }}
        >
          <section
            className={`modal-card auth-modal ${
              authMode === 'signup' ? 'signup-modal' : 'signin-modal'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setShowPassword(false);
                setShowAuth(false);
              }}
              aria-label="Close"
            >
              ×
            </button>

            <div className="auth-modal-icon">
              {authMode === 'signup' ? '✦' : '↗'}
            </div>
            <span className="eyebrow">
              {authMode === 'signup' ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}
            </span>
            <h2 id="auth-title">
              {authMode === 'signup'
                ? 'Create your account'
                : 'Sign in to FindIt'}
            </h2>
            <p className="modal-description">
              {authMode === 'signup'
                ? 'Choose a username so we can welcome you by name.'
                : 'Sign in to report items and manage your reports.'}
            </p>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <div className="form-field">
                  <label htmlFor="auth-username">Username</label>
                  <input
                    id="auth-username"
                    type="text"
                    placeholder="e.g. Alex"
                    value={authUsername}
                    onChange={(event) => setAuthUsername(event.target.value)}
                    maxLength={40}
                    autoComplete="nickname"
                    required
                  />
                </div>
              )}

              <div className="form-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="auth-password">Password</label>

                <div className="password-input-wrapper">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    autoComplete={
                      authMode === 'signup'
                        ? 'new-password'
                        : 'current-password'
                    }
                    minLength={6}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7a11.8 11.8 0 01-3.1 4.3" />
                        <path d="M6.2 6.2A12.4 12.4 0 002.5 12c1 2.5 4.5 7 9.5 7a10.5 10.5 0 004-.8" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={authLoading}
              >
                {authLoading
                  ? 'Please wait...'
                  : authMode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
              </button>
            </form>

            <div className="auth-switch">
              {authMode === 'signup'
                ? 'Already have an account?'
                : 'New to FindIt?'}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                  setAuthUsername('');
                  setShowPassword(false);
                  setMessage('');
                  setErrorMessage('');
                }}
              >
                {authMode === 'signup' ? 'Sign in' : 'Create account'}
              </button>
            </div>
          </section>
        </div>
      )}

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="modal-card report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => !isSaving && setShowForm(false)}
              aria-label="Close"
            >
              ×
            </button>

            <span className="eyebrow">CAMPUS LOST AND FOUND</span>
            <h2 id="report-title">
              {editingItem ? 'Edit your report' : 'Report an item'}
            </h2>
            <p className="modal-description">
              Share the details so others can identify the item.
            </p>

            <form className="report-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="item-name">Item name</label>
                <input
                  id="item-name"
                  type="text"
                  placeholder="e.g. Black backpack"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="item-status">Status</label>
                  <select
                    id="item-status"
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as Status,
                      })
                    }
                  >
                    <option value="Lost">Lost</option>
                    <option value="Found">Found</option>
                    {editingItem?.status === 'Returned' && (
                      <option value="Returned">Returned</option>
                    )}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="item-category">Category</label>
                  <select
                    id="item-category"
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="item-location">Location</label>
                <input
                  id="item-location"
                  type="text"
                  placeholder="Where was it lost or found?"
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                  maxLength={150}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="item-photo">Item photo (optional)</label>
                <input
                  id="item-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <span className="field-hint">Maximum image size: 3 MB.</span>
                {photoError && (
                  <span className="field-error">{photoError}</span>
                )}
                {photo && (
                  <div className="photo-preview">
                    <img src={photo} alt="Item preview" />
                    <button
                      type="button"
                      className="remove-photo"
                      onClick={() => {
                        setPhoto('');
                        setPhotoFile(null);
                        setPhotoError('');
                      }}
                    >
                      Remove photo
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={isSaving || Boolean(photoError)}
              >
                {isSaving
                  ? 'Saving...'
                  : editingItem
                  ? 'Save changes'
                  : 'Submit report'}
              </button>
            </form>
          </section>
        </div>
      )}

      {showMessages && (
        <div
          className="modal-backdrop messages-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowMessages(false);
              setActiveConversation(null);
            }
          }}
        >
          <section
            className="modal-card messages-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="messages-title"
          >
            <div className="messages-header">
              {activeConversation && (
                <button
                  type="button"
                  className="messages-back-button"
                  onClick={() => {
                    setActiveConversation(null);
                    setChatMessages([]);
                    void loadConversations();
                  }}
                >
                  ← Inbox
                </button>
              )}

              <div>
                <span className="eyebrow">PRIVATE MESSAGES</span>
                <h2 id="messages-title">
                  {activeConversation ? 'Conversation' : 'Your messages'}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setShowMessages(false);
                  setActiveConversation(null);
                }}
                aria-label="Close messages"
              >
                ×
              </button>
            </div>

            {!activeConversation ? (
              <div className="conversation-list">
                {loadingConversations ? (
                  <div className="empty-chat-state">
                    Loading conversations...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="empty-chat-state">
                    <span className="empty-chat-icon">✉</span>
                    <h3>No conversations yet</h3>
                    <p>
                      Open an item report and select Message Reporter to start a
                      private conversation.
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setShowMessages(false);
                        scrollToItems();
                      }}
                    >
                      Browse items
                    </button>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const relatedItem = items.find(
                      (item) => item.id === conversation.itemId
                    );

                    const isReporter = user?.id === conversation.reporterId;

                    return (
                      <button
                        type="button"
                        className="conversation-row"
                        key={conversation.id}
                        onClick={() => void openConversation(conversation)}
                      >
                        <span className="conversation-avatar">
                          {relatedItem?.icon || '✉'}
                        </span>

                        <span className="conversation-info">
                          <strong>{relatedItem?.name || 'Item report'}</strong>
                          <span>
                            {isReporter
                              ? 'You reported this item'
                              : 'You contacted the reporter'}
                          </span>
                          <small>{formatDate(conversation.createdAt)}</small>
                        </span>

                        <span className="conversation-arrow">›</span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="chat-container">
                <div className="chat-item-context">
                  <span>
                    {items.find((item) => item.id === activeConversation.itemId)
                      ?.icon || '📦'}
                  </span>
                  <div>
                    <strong>
                      {items.find(
                        (item) => item.id === activeConversation.itemId
                      )?.name || 'Item report'}
                    </strong>
                    <small>
                      {user?.id === activeConversation.reporterId
                        ? 'Conversation with someone interested in your report'
                        : 'Conversation with the person who reported this item'}
                    </small>
                  </div>
                </div>

                <div className="chat-messages">
                  {loadingMessages ? (
                    <div className="empty-chat-state">Loading messages...</div>
                  ) : chatMessages.length === 0 ? (
                    <div className="empty-chat-state">
                      <p>No messages yet. Say hello to get started!</p>
                    </div>
                  ) : (
                    chatMessages.map((chatMessage) => {
                      const isMine = chatMessage.senderId === user?.id;

                      return (
                        <div
                          key={chatMessage.id}
                          className={`chat-message-row ${
                            isMine ? 'chat-message-mine' : 'chat-message-theirs'
                          }`}
                        >
                          <div className="chat-bubble">
                            <p>{chatMessage.body}</p>
                            <time>
                              {new Date(chatMessage.createdAt).toLocaleString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                }
                              )}
                            </time>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  className="refresh-messages-button"
                  onClick={() => void loadChatMessages(activeConversation.id)}
                  disabled={loadingMessages}
                >
                  {loadingMessages ? 'Refreshing...' : 'Refresh messages'}
                </button>

                <form className="chat-compose" onSubmit={sendChatMessage}>
                  <textarea
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    placeholder="Write a message..."
                    maxLength={3000}
                    rows={2}
                    aria-label="Your message"
                    required
                  />

                  <button
                    type="submit"
                    className="chat-send-button"
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </form>

                <p className="chat-privacy-note">
                  Keep personal and sensitive information private.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {selectedPhoto && (
        <div
          className="photo-backdrop"
          onClick={() => setSelectedPhoto('')}
          role="presentation"
        >
          <button
            type="button"
            className="photo-modal-close"
            onClick={() => setSelectedPhoto('')}
            aria-label="Close photo"
          >
            ×
          </button>
          <img
            src={selectedPhoto}
            alt="Full-size item"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
