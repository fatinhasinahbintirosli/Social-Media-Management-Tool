const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ambil terus dari elemen DOM atau pastikan rujukan state sahih
    console.log("selectedIndices semasa submit:", selectedIndices);

    if (!selectedIndices || selectedIndices.length === 0 || pages.length === 0) {
      alert('Ralat: Sila pilih sekurang-kurangnya satu Page.');
      return;
    }

    // Tukar index terpilih kepada page_id sebenar
    const selectedPageIds = selectedIndices.map(index => String(pages[index]?.page_id)).filter(Boolean);

    console.log("Senarai Page ID dihantar:", selectedPageIds);

    if (selectedPageIds.length === 0) {
      alert('Ralat: Sila pilih sekurang-kurangnya satu Page.');
      return;
    }

    setLoading(true);
    
    let finalImageUrl = imageUrl || null;
    let finalVideoUrl = null;

    if (finalImageUrl) {
      const lowerUrl = finalImageUrl.toLowerCase();
      if (lowerUrl.endsWith('.mp4') || lowerUrl.includes('video') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm')) {
        finalVideoUrl = finalImageUrl;
        finalImageUrl = null;
      }
    }

    let finalScheduledAt = scheduledAt || null;
    if (postMode === 'now') {
      finalScheduledAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    } else if (postMode === 'auto') {
      finalScheduledAt = 'auto-queue';
    }

    const payload = {
      pageIds: selectedPageIds,
      message,
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl,
      firstComment: firstComment || null,
      commentImageUrl: commentImageUrl || null,
      scheduledAt: finalScheduledAt,
      profile: currentProfile,
    };

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (postMode === 'now') {
        await fetch('/api/cron/process-posts');
      }

      alert(data.message || 'Berjaya!');
      
      setMessage(''); 
      setImageUrl(''); 
      setFirstComment(''); 
      setCommentImageUrl('');
      setSelectedIndices([]);
    } catch (err) {
      alert(`Ralat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
