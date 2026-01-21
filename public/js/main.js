const API_URL = '/api/blogs';

const blogForm = document.getElementById('blog-form');
const titleInput = document.getElementById('title');
const authorInput = document.getElementById('author');
const bodyInput = document.getElementById('body');
const tagsInput = document.getElementById('tags');
const blogIdInput = document.getElementById('blog-id');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const messageDiv = document.getElementById('message');
const blogsContainer = document.getElementById('blogs-container');
const searchInput = document.getElementById('search-input');
const tagFilter = document.getElementById('tag-filter');
const sortFilter = document.getElementById('sort-filter');

let isEditMode = false;
let allTags = new Set();

document.addEventListener('DOMContentLoaded', () => {
  loadBlogs();
  setupEventListeners();
});

function setupEventListeners() {
  blogForm.addEventListener('submit', handleSubmit);
  cancelBtn.addEventListener('click', resetForm);
  sortFilter.addEventListener('change', applyFilters);
  tagFilter.addEventListener('change', applyFilters);
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  });
}

function showMessage(text, type = 'success') {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

async function handleSubmit(e) {
  e.preventDefault();
  
  const blogData = {
    title: titleInput.value.trim(),
    body: bodyInput.value.trim(),
    author: authorInput.value.trim() || 'Anonymous',
    tags: tagsInput.value.trim()
  };

  try {
    let response;
    
    if (isEditMode) {
      const blogId = blogIdInput.value;
      response = await fetch(`${API_URL}/${blogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blogData)
      });
    } else {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blogData)
      });
    }

    const data = await response.json();

    if (data.success) {
      showMessage(data.message, 'success');
      resetForm();
      loadBlogs();
    } else {
      showMessage(data.message || 'An error occurred', 'error');
    }
  } catch (error) {
    showMessage('Failed to save blog post. Please try again.', 'error');
    console.error('Error:', error);
  }
}

async function applyFilters() {
  const searchTerm = searchInput.value.trim();
  const selectedTag = tagFilter.value;
  const sortBy = sortFilter.value;
  
  let url = API_URL;
  const params = new URLSearchParams();
  
  if (searchTerm) params.append('search', searchTerm);
  if (selectedTag) params.append('tag', selectedTag);
  if (sortBy) params.append('sortBy', sortBy);
  
  if (params.toString()) {
    url += '?' + params.toString();
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      displayBlogs(data.data);
    } else {
      blogsContainer.innerHTML = '<p class="no-blogs">Failed to load blog posts</p>';
    }
  } catch (error) {
    blogsContainer.innerHTML = '<p class="no-blogs">Error loading blog posts</p>';
    console.error('Error:', error);
  }
}

function resetFilters() {
  searchInput.value = '';
  tagFilter.value = '';
  sortFilter.value = 'newest';
  loadBlogs();
}

async function loadBlogs() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (data.success) {
      allTags.clear();
      data.data.forEach(blog => {
        if (blog.tags && blog.tags.length > 0) {
          blog.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      updateTagFilter();
      displayBlogs(data.data);
    } else {
      blogsContainer.innerHTML = '<p class="no-blogs">Failed to load blog posts</p>';
    }
  } catch (error) {
    blogsContainer.innerHTML = '<p class="no-blogs">Error loading blog posts</p>';
    console.error('Error:', error);
  }
}

function updateTagFilter() {
  const currentValue = tagFilter.value;
  tagFilter.innerHTML = '<option value="">All Tags</option>';
  
  Array.from(allTags).sort().forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });
  
  if (currentValue && allTags.has(currentValue)) {
    tagFilter.value = currentValue;
  }
}

function displayBlogs(blogs) {
  if (blogs.length === 0) {
    blogsContainer.innerHTML = '<p class="no-blogs">No blog posts found. Try adjusting your search or create a new post!</p>';
    return;
  }

  blogsContainer.innerHTML = blogs.map(blog => `
    <div class="blog-card" data-id="${blog._id}">
      <h3>${escapeHtml(blog.title)}</h3>
      <div class="blog-meta">
        <span class="blog-author">By ${escapeHtml(blog.author)}</span>
        <span class="blog-date">${formatDate(blog.createdAt)}</span>
      </div>
      ${blog.tags && blog.tags.length > 0 ? `
        <div class="blog-tags">
          ${blog.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="blog-body">${escapeHtml(blog.body)}</div>
      <div class="blog-actions">
        <button class="btn btn-edit" onclick="editBlog('${blog._id}')">Edit</button>
        <button class="btn btn-delete" onclick="deleteBlog('${blog._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function editBlog(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const data = await response.json();

    if (data.success) {
      const blog = data.data;
      
      isEditMode = true;
      blogIdInput.value = blog._id;
      titleInput.value = blog.title;
      authorInput.value = blog.author;
      bodyInput.value = blog.body;
      tagsInput.value = blog.tags ? blog.tags.join(', ') : '';
      
      formTitle.textContent = 'Update Blog Post';
      submitBtn.textContent = 'Update Post';
      cancelBtn.style.display = 'inline-block';
      
      document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    } else {
      showMessage('Failed to load blog post', 'error');
    }
  } catch (error) {
    showMessage('Error loading blog post', 'error');
    console.error('Error:', error);
  }
}

async function deleteBlog(id) {
  if (!confirm('Are you sure you want to delete this blog post?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showMessage(data.message, 'success');
      loadBlogs();
    } else {
      showMessage(data.message || 'Failed to delete blog post', 'error');
    }
  } catch (error) {
    showMessage('Error deleting blog post', 'error');
    console.error('Error:', error);
  }
}

function resetForm() {
  blogForm.reset();
  isEditMode = false;
  blogIdInput.value = '';
  formTitle.textContent = 'Create New Blog Post';
  submitBtn.textContent = 'Create Post';
  cancelBtn.style.display = 'none';
}

function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.editBlog = editBlog;
window.deleteBlog = deleteBlog;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;get: error.message